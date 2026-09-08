using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Products.Infrastructure.Rakuten;
using Xunit;

namespace Products.Infrastructure.Tests.Rakuten;

public sealed class RakutenCatalogClientTests
{
    [Fact]
    public async Task Search_MapsStructuredResponse_AndSendsCredentialsServerSide()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, """{"count":1,"page":1,"hits":20,"pageCount":1,"items":[{"itemName":"Camera","itemCode":"shop:1","itemPrice":1200,"itemCaption":"Desc","itemUrl":"https://item","affiliateUrl":"https://affiliate","availability":1,"genreId":1,"shopCode":"shop","shopName":"Shop","reviewAverage":4.5,"reviewCount":3,"mediumImageUrls":[{"imageUrl":"https://image"}]}]}""");
        var client = Create(handler);

        var result = await client.SearchAsync(new("camera", null, null, null), CancellationToken.None);

        var item = Assert.Single(result.Items);
        Assert.Equal("shop:1", item.ExternalId); Assert.Equal(1200m, item.Price); Assert.Equal("JPY", item.CurrencyCode);
        Assert.Equal("secret", handler.LastRequest!.Headers.GetValues("accessKey").Single());
        Assert.DoesNotContain("secret", handler.LastRequest.RequestUri!.Query);
    }

    [Fact]
    public async Task Search_UsesCache()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, """{"count":0,"page":1,"hits":20,"pageCount":0,"items":[]}""");
        var client = Create(handler);
        await client.SearchAsync(new("camera", null, null, null), CancellationToken.None);
        await client.SearchAsync(new("camera", null, null, null), CancellationToken.None);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task Search_WithoutCredentials_FailsWithoutCallingRakuten()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, "{}");
        var client = new RakutenCatalogClient(new HttpClient(handler) { BaseAddress = new Uri("https://openapi.rakuten.co.jp/") },
            new MemoryCache(new MemoryCacheOptions { SizeLimit = 100 }), Options.Create(new RakutenSettings()), NullLogger<RakutenCatalogClient>.Instance);
        await Assert.ThrowsAsync<Products.Application.ExternalProducts.ExternalCatalogUnavailableException>(() =>
            client.SearchAsync(new("camera", null, null, null), CancellationToken.None));
        Assert.Equal(0, handler.Calls);
    }

    private static RakutenCatalogClient Create(FakeHandler handler) => new(new HttpClient(handler) { BaseAddress = new Uri("https://openapi.rakuten.co.jp/") },
        new MemoryCache(new MemoryCacheOptions { SizeLimit = 100 }), Options.Create(new RakutenSettings { ApplicationId = "app", AccessKey = "secret" }),
        NullLogger<RakutenCatalogClient>.Instance);

    private sealed class FakeHandler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        public int Calls { get; private set; } public HttpRequestMessage? LastRequest { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        { Calls++; LastRequest = request; return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json") }); }
    }
}
