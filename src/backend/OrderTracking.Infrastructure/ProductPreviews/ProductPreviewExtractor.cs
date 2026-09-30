using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.ProductPreviews;

public sealed record ProductPreviewResult(byte[] Content, string ContentType, string Extension, string Source);

public sealed class ProductPreviewExtractor(
    IHttpClientFactory httpClientFactory,
    IImageCompressor imageCompressor,
    ILogger<ProductPreviewExtractor> logger)
{
    private const int MaxRedirects = 3;
    private const int MaxHtmlBytes = 1024 * 1024;
    private const int MaxImageBytes = 10 * 1024 * 1024;
    private static readonly Regex MetaRegex = new("<meta\\b[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AttributeRegex = new("(?<name>[a-zA-Z_:][-a-zA-Z0-9_:.]*)\\s*=\\s*(?:\"(?<double>[^\"]*)\"|'(?<single>[^']*)'|(?<bare>[^\\s>]+))", RegexOptions.Compiled);

    public async Task<ProductPreviewResult?> ExtractAsync(string sourceUrl, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var pageUri)
            || !await ProductPreviewSsrfGuard.IsAllowedAsync(pageUri, cancellationToken))
        {
            logger.LogWarning("Rejected unsafe product preview URL {SourceUrl}", sourceUrl);
            return null;
        }

        try
        {
            var client = httpClientFactory.CreateClient("ProductPreview");
            var (htmlResponse, finalPageUri) = await SendFollowingRedirectsAsync(client, pageUri, cancellationToken);
            using (htmlResponse)
            {
                if (!htmlResponse.IsSuccessStatusCode
                    || htmlResponse.Content.Headers.ContentType?.MediaType?.StartsWith("text/html", StringComparison.OrdinalIgnoreCase) != true)
                {
                    return null;
                }

                var htmlBytes = await ReadLimitedAsync(await htmlResponse.Content.ReadAsStreamAsync(cancellationToken), MaxHtmlBytes, cancellationToken);
                if (htmlBytes is null)
                {
                    return null;
                }

                var html = System.Text.Encoding.UTF8.GetString(htmlBytes);
                var openGraphImage = FindImage(html, "property", "og:image");
                var twitterImage = FindImage(html, "name", "twitter:image")
                    ?? FindImage(html, "property", "twitter:image");
                var candidate = openGraphImage ?? twitterImage;
                if (candidate is null || !Uri.TryCreate(finalPageUri, WebUtility.HtmlDecode(candidate), out var imageUri)
                    || !await ProductPreviewSsrfGuard.IsAllowedAsync(imageUri, cancellationToken))
                {
                    return null;
                }

                var source = openGraphImage is not null ? "OpenGraph" : "Twitter";
                var (imageResponse, _) = await SendFollowingRedirectsAsync(client, imageUri, cancellationToken);
                using (imageResponse)
                {
                    var contentType = imageResponse.Content.Headers.ContentType?.MediaType;
                    if (!imageResponse.IsSuccessStatusCode
                        || contentType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) != true
                        || imageResponse.Content.Headers.ContentLength > MaxImageBytes)
                    {
                        return null;
                    }

                    var imageBytes = await ReadLimitedAsync(await imageResponse.Content.ReadAsStreamAsync(cancellationToken), MaxImageBytes, cancellationToken);
                    if (imageBytes is null)
                    {
                        return null;
                    }

                    await using var input = new MemoryStream(imageBytes);
                    var compressed = await imageCompressor.CompressAsync(input, contentType, cancellationToken);
                    if (compressed is null)
                    {
                        return null;
                    }

                    await using var output = compressed.Value.Content;
                    await using var buffer = new MemoryStream();
                    await output.CopyToAsync(buffer, cancellationToken);
                    return new ProductPreviewResult(buffer.ToArray(), compressed.Value.ContentType, compressed.Value.Extension, source);
                }
            }
        }
        catch (Exception exception) when (exception is HttpRequestException or IOException or TaskCanceledException)
        {
            logger.LogWarning(exception, "Could not extract product preview from {SourceUrl}", sourceUrl);
            return null;
        }
    }

    private static string? FindImage(string html, string keyAttribute, string keyValue)
    {
        foreach (Match meta in MetaRegex.Matches(html))
        {
            var attributes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match match in AttributeRegex.Matches(meta.Value))
            {
                attributes[match.Groups["name"].Value] = match.Groups["double"].Success
                    ? match.Groups["double"].Value
                    : match.Groups["single"].Success
                        ? match.Groups["single"].Value
                        : match.Groups["bare"].Value;
            }
            if (attributes.TryGetValue(keyAttribute, out var key)
                && key.Equals(keyValue, StringComparison.OrdinalIgnoreCase)
                && attributes.TryGetValue("content", out var content)
                && !string.IsNullOrWhiteSpace(content))
            {
                return content.Trim();
            }
        }

        return null;
    }

    private static async Task<(HttpResponseMessage Response, Uri FinalUri)> SendFollowingRedirectsAsync(
        HttpClient client,
        Uri startUri,
        CancellationToken cancellationToken)
    {
        var current = startUri;
        for (var redirect = 0; redirect <= MaxRedirects; redirect++)
        {
            if (!await ProductPreviewSsrfGuard.IsAllowedAsync(current, cancellationToken))
            {
                throw new HttpRequestException("Unsafe redirect target.");
            }

            var response = await client.GetAsync(current, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if ((int)response.StatusCode is < 300 or >= 400 || response.Headers.Location is null)
            {
                return (response, current);
            }

            if (redirect == MaxRedirects)
            {
                response.Dispose();
                throw new HttpRequestException("Too many redirects.");
            }

            current = response.Headers.Location.IsAbsoluteUri
                ? response.Headers.Location
                : new Uri(current, response.Headers.Location);
            response.Dispose();
        }

        throw new HttpRequestException("Too many redirects.");
    }

    private static async Task<byte[]?> ReadLimitedAsync(Stream source, int maxBytes, CancellationToken cancellationToken)
    {
        await using var buffer = new MemoryStream();
        var chunk = new byte[81920];
        while (true)
        {
            var read = await source.ReadAsync(chunk, cancellationToken);
            if (read == 0)
            {
                return buffer.ToArray();
            }

            if (buffer.Length + read > maxBytes)
            {
                return null;
            }

            await buffer.WriteAsync(chunk.AsMemory(0, read), cancellationToken);
        }
    }
}

public static class ProductPreviewSsrfGuard
{
    public static async Task<bool> IsAllowedAsync(Uri uri, CancellationToken cancellationToken = default)
    {
        if (uri.Scheme is not ("http" or "https") || string.IsNullOrWhiteSpace(uri.Host)
            || uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        try
        {
            var addresses = await Dns.GetHostAddressesAsync(uri.DnsSafeHost, cancellationToken);
            return addresses.Length > 0 && addresses.All(IsPublicAddress);
        }
        catch (SocketException)
        {
            return false;
        }
    }

    public static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (IPAddress.IsLoopback(address) || address.IsIPv6LinkLocal || address.IsIPv6Multicast || address.IsIPv6SiteLocal)
        {
            return false;
        }

        var bytes = address.GetAddressBytes();
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            return bytes[0] != 0
                && bytes[0] != 10
                && bytes[0] != 127
                && !(bytes[0] == 100 && bytes[1] is >= 64 and <= 127)
                && !(bytes[0] == 169 && bytes[1] == 254)
                && !(bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
                && !(bytes[0] == 192 && bytes[1] == 0 && bytes[2] == 0)
                && !(bytes[0] == 192 && bytes[1] == 0 && bytes[2] == 2)
                && !(bytes[0] == 192 && bytes[1] == 168)
                && !(bytes[0] == 198 && bytes[1] is 18 or 19)
                && !(bytes[0] == 198 && bytes[1] == 51 && bytes[2] == 100)
                && !(bytes[0] == 203 && bytes[1] == 0 && bytes[2] == 113)
                && bytes[0] < 224;
        }

        return !(bytes[0] is 0xfc or 0xfd)
            && !(bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0d && bytes[3] == 0xb8)
            && !address.Equals(IPAddress.IPv6None)
            && !address.Equals(IPAddress.IPv6Any);
    }
}
