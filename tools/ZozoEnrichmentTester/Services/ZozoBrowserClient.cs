using System.Text.Json;
using Microsoft.Playwright;
using ZozoEnrichmentTester.Configuration;
using ZozoEnrichmentTester.Models;

namespace ZozoEnrichmentTester.Services;

public sealed class ZozoBrowserClient : IAsyncDisposable
{
    private const string ZozoHome = "https://zozo.jp/";
    private const string KnownBffUrl = "/apis/bff/v2/browser/goods/main-visual?device=pc&goods_id=102859695&goods_detail_id=165302541&goods_type_id=2021&shop_id=1974&include_movie=true";
    private readonly ZozoOptions _options;
    private IPlaywright? _playwright;
    private IBrowser? _browser;
    private IBrowserContext? _context;
    private IPage? _apiPage;
    private IPage? _productPage;

    public ZozoBrowserClient(ZozoOptions options) => _options = options;

    public async Task<BrowserSessionDiagnostics> InitializeAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _playwright = await Playwright.CreateAsync();
        try
        {
            _browser = await _playwright.Chromium.ConnectOverCDPAsync(_options.CdpEndpoint, new()
            {
                IsLocal = true,
                NoDefaults = true,
                Timeout = 10_000,
            });
        }
        catch (Exception exception)
        {
            throw new CdpConnectionException($"Could not connect to Edge CDP at {_options.CdpEndpoint}.", exception);
        }

        _context = _browser.Contexts.FirstOrDefault()
            ?? throw new CdpConnectionException("Connected to Edge CDP, but no browser context was found.");
        _apiPage = await CreateApiPageAsync(cancellationToken);

        var cookies = await _context.CookiesAsync(ZozoHome);
        var metadata = cookies.Select(cookie => new CookieMetadata(cookie.Name, cookie.Domain, cookie.Path)).ToList();
        var uidPresent = cookies.Any(cookie => cookie.Name.Equals("ZOZO_UID", StringComparison.OrdinalIgnoreCase)
            || cookie.Name.Equals("ZOZO%5FUID", StringComparison.OrdinalIgnoreCase));

        return new BrowserSessionDiagnostics(_browser.Contexts.Count, _context.Pages.Count, _apiPage.Url, uidPresent, metadata);
    }

    public async Task<KnownBffDiagnostics> TestKnownBffAsync(CancellationToken cancellationToken)
    {
        var result = await FetchJsonAsync(KnownBffUrl, cancellationToken);
        var imagesCount = 0;
        if (result.Status == 200)
        {
            try
            {
                using var document = JsonDocument.Parse(result.Text);
                if (document.RootElement.TryGetProperty("images", out var images) && images.ValueKind == JsonValueKind.Array)
                    imagesCount = images.GetArrayLength();
            }
            catch (JsonException) { }
        }
        return new KnownBffDiagnostics(result.Status, result.Text.Length, imagesCount);
    }

    public Task<BrowserFetchResult> FetchJsonAsync(string relativeUrl, CancellationToken cancellationToken) =>
        EvaluateFetchAsync(relativeUrl, includeApiKey: true, accept: "application/json", cancellationToken);

    public Task<BrowserFetchResult> FetchHtmlAsync(string productUrl, CancellationToken cancellationToken) =>
        EvaluateFetchAsync(productUrl, includeApiKey: false, accept: "text/html,application/xhtml+xml", cancellationToken);

    private async Task<BrowserFetchResult> EvaluateFetchAsync(string url, bool includeApiKey, string accept, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            await EnsureApiPageAsync(cancellationToken);
            try
            {
                return await EvaluateFetchOnCurrentPageAsync(url, includeApiKey, accept, cancellationToken);
            }
            catch (PlaywrightException exception) when (IsTargetClosed(exception) && attempt == 0 && _browser!.IsConnected)
            {
                _apiPage = null;
                Console.WriteLine("  API transport page was closed; recreated it once.");
            }
            catch (PlaywrightException exception) when (IsTargetClosed(exception))
            {
                throw new CdpConnectionException("The Edge page/context used for API transport was closed.", exception);
            }
        }
        throw new CdpConnectionException("Could not restore the Edge API transport page.");
    }

    private async Task<BrowserFetchResult> EvaluateFetchOnCurrentPageAsync(
        string url,
        bool includeApiKey,
        string accept,
        CancellationToken cancellationToken)
    {
        var evaluation = _apiPage!.EvaluateAsync<BrowserFetchResult>("""
            async ({ url, apiKey, includeApiKey, accept, timeoutMs }) => {
                const headers = { "Accept": accept };
                if (includeApiKey) headers["zozo-web-gateway-api-key"] = apiKey;
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const response = await fetch(url, {
                        method: "GET",
                        credentials: "include",
                        headers,
                        signal: controller.signal
                    });
                    return { status: response.status, text: await response.text() };
                } catch (error) {
                    const message = error?.name === "AbortError"
                        ? `request timed out after ${timeoutMs} ms`
                        : `browser fetch failed: ${error?.message ?? String(error)}`;
                    return { status: 0, text: message };
                } finally {
                    clearTimeout(timer);
                }
            }
            """, new { url, apiKey = _options.ApiKey, includeApiKey, accept, timeoutMs = _options.RequestTimeoutMs });
        BrowserFetchResult result;
        try
        {
            result = await evaluation.WaitAsync(TimeSpan.FromMilliseconds(_options.RequestTimeoutMs + 10_000), cancellationToken);
        }
        catch (TimeoutException)
        {
            result = new BrowserFetchResult
            {
                Status = 0,
                Text = $"Playwright evaluation timed out after {_options.RequestTimeoutMs + 10_000} ms",
            };
        }
        cancellationToken.ThrowIfCancellationRequested();
        return result;
    }

    public async Task<ProductPageResult> NavigateProductPageAsync(string productUrl, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            await EnsureProductPageAsync(cancellationToken);
            try
            {
                var response = await _productPage!.GotoAsync(productUrl, new() { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 60_000 });
                var title = await _productPage.TitleAsync();
                var html = await _productPage.ContentAsync();
                var locator = _productPage.Locator("script#__NEXT_DATA__");
                var nextData = await locator.CountAsync() > 0 ? await locator.First.TextContentAsync() : null;
                return new ProductPageResult(response?.Status, title, _productPage.Url, html, nextData);
            }
            catch (PlaywrightException exception) when (IsTargetClosed(exception) && attempt == 0 && _browser!.IsConnected)
            {
                _productPage = null;
                Console.WriteLine("  Product page was closed; recreated it once.");
            }
            catch (PlaywrightException exception) when (IsTargetClosed(exception))
            {
                throw new CdpConnectionException("The Edge product page/context was closed.", exception);
            }
        }
        throw new CdpConnectionException("Could not restore the Edge product page.");
    }

    private void EnsureConnected()
    {
        if (_browser is null || !_browser.IsConnected || _context is null)
            throw new CdpConnectionException("The Edge CDP connection was lost. Restart Edge manually and run the command again.");
    }

    private async Task EnsureApiPageAsync(CancellationToken cancellationToken)
    {
        EnsureConnected();
        if (_apiPage is null || _apiPage.IsClosed)
            _apiPage = await CreateApiPageAsync(cancellationToken);
    }

    private async Task<IPage> CreateApiPageAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            var page = await _context!.NewPageAsync();
            await page.GotoAsync(ZozoHome, new() { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 60_000 });
            return page;
        }
        catch (PlaywrightException exception)
        {
            throw new CdpConnectionException("Could not create the dedicated Edge API transport page.", exception);
        }
    }

    private async Task EnsureProductPageAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        if (_productPage is null || _productPage.IsClosed)
            _productPage = await _context!.NewPageAsync();
    }

    private static bool IsTargetClosed(PlaywrightException exception) =>
        exception.Message.Contains("Target page, context or browser has been closed", StringComparison.OrdinalIgnoreCase)
        || exception.Message.Contains("Target closed", StringComparison.OrdinalIgnoreCase)
        || exception.Message.Contains("frame was detached", StringComparison.OrdinalIgnoreCase);

    public async ValueTask DisposeAsync()
    {
        // Close only pages created by this client. The external Edge and its context are user-owned.
        try { if (_productPage is { IsClosed: false }) await _productPage.CloseAsync(); } catch { }
        try { if (_apiPage is { IsClosed: false }) await _apiPage.CloseAsync(); } catch { }
        _playwright?.Dispose();
    }
}
