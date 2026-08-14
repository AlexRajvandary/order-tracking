using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OrderTracking.Infrastructure.Monitoring;
using OrderTracking.Infrastructure.Services;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Services;

public sealed class FornexVpsStatsServiceTests
{
    [Fact]
    public async Task GetAsync_SendsApiKeyAndMapsChartSeries()
    {
        string? requestUri = null;
        string? authorization = null;
        var handler = new StubHttpMessageHandler(request =>
        {
            requestUri = request.RequestUri?.ToString();
            authorization = request.Headers.GetValues("Authorization").Single();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "series": [{
                        "color": "#60B5FF",
                        "data": [[1677628800000, 12.5]],
                        "name": "Входящий"
                      }],
                      "subtitle": "Период"
                    }
                    """,
                    Encoding.UTF8,
                    "application/json"),
            };
        });
        using var client = new HttpClient(handler) { BaseAddress = new Uri("https://fornex.com/api/") };
        var service = CreateService(client, "secret-key", "34-1234");

        var result = await service.GetAsync(
            "traffic",
            new DateTimeOffset(2026, 8, 14, 8, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 8, 14, 9, 0, 0, TimeSpan.Zero),
            CancellationToken.None);

        Assert.Equal("Api-Key secret-key", authorization);
        Assert.Contains("vps/34-1234/stats/traffic/", requestUri);
        Assert.Contains("start=", requestUri);
        Assert.Contains("end=", requestUri);
        Assert.Equal("Период", result.Subtitle);
        var series = Assert.Single(result.Series);
        Assert.Equal("Входящий", series.Name);
        var point = Assert.Single(series.Data);
        Assert.Equal(1677628800000, point.Timestamp);
        Assert.Equal(12.5, point.Value);
    }

    [Fact]
    public async Task GetAsync_RejectsMissingConfigurationBeforeCallingProvider()
    {
        var handler = new StubHttpMessageHandler(_ =>
            throw new InvalidOperationException("HTTP request must not be sent."));
        using var client = new HttpClient(handler) { BaseAddress = new Uri("https://fornex.com/api/") };
        var service = CreateService(client, string.Empty, string.Empty);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetAsync(
            "cpu",
            DateTimeOffset.UtcNow.AddHours(-1),
            DateTimeOffset.UtcNow,
            CancellationToken.None));
    }

    private static FornexVpsStatsService CreateService(
        HttpClient client,
        string apiKey,
        string orderId) =>
        new(
            client,
            Options.Create(new FornexSettings { ApiKey = apiKey, OrderId = orderId }),
            NullLogger<FornexVpsStatsService>.Instance);

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(responseFactory(request));
    }
}
