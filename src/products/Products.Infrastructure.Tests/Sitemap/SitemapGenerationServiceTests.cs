using System.Xml;
using System.Xml.Linq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Products.Infrastructure.Services.Sitemap;
using Xunit;

namespace Products.Infrastructure.Tests.Sitemap;

public sealed class SitemapGenerationServiceTests : IDisposable
{
    private static readonly XNamespace Ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
    private readonly string _root = Path.Combine(Path.GetTempPath(), $"the-get-sitemap-tests-{Guid.NewGuid():N}");
    private readonly List<ServiceProvider> _providers = [];

    [Fact]
    public async Task IndexContainsEveryGeneratedChildSitemap()
    {
        var (service, _) = CreateService(Products(5), productsPerFile: 2);
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));

        var index = XDocument.Load(ActiveFile("sitemap.xml"));
        var locations = index.Root!.Elements(Ns + "sitemap").Select(x => x.Element(Ns + "loc")!.Value).ToList();
        Assert.Contains("https://the-get.ru/sitemaps/static.xml", locations);
        Assert.Contains("https://the-get.ru/sitemaps/categories.xml", locations);
        Assert.Contains("https://the-get.ru/sitemaps/products-0001.xml", locations);
        Assert.Contains("https://the-get.ru/sitemaps/products-0003.xml", locations);
        Assert.Equal(5, locations.Count);
    }

    [Fact]
    public async Task ProductsAreSplitAtConfiguredTarget()
    {
        var (service, _) = CreateService(Products(7), productsPerFile: 3);
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));
        Assert.Equal(3, Directory.GetFiles(ActiveDirectory(), "products-*.xml").Length);
        Assert.Equal(new[] { 3, 3, 1 }, ProductFileUrlCounts());
    }

    [Fact]
    public async Task HardUrlLimitIsAlwaysRespected()
    {
        var (service, _) = CreateService(Products(8), productsPerFile: 50_000, maxUrls: 3);
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));
        Assert.All(ProductFileUrlCounts(), count => Assert.InRange(count, 1, 3));
        Assert.Equal(8, ProductFileUrlCounts().Sum());
    }

    [Fact]
    public async Task ByteGuardRotatesFilesBeforeConfiguredLimit()
    {
        var products = Products(12, slugLength: 180);
        var (service, _) = CreateService(products, productsPerFile: 50_000, maxBytes: 2_048);
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));
        Assert.True(Directory.GetFiles(ActiveDirectory(), "products-*.xml").Length > 1);
        Assert.All(Directory.GetFiles(ActiveDirectory(), "products-*.xml"), path =>
            Assert.InRange(new FileInfo(path).Length, 1, 2_048));
    }

    [Fact]
    public async Task EveryGeneratedXmlFileIsValid()
    {
        var (service, _) = CreateService(Products(6), productsPerFile: 2);
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));
        foreach (var path in Directory.GetFiles(ActiveDirectory(), "*.xml"))
        {
            using var reader = XmlReader.Create(path, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit });
            while (reader.Read()) { }
        }
    }

    [Fact]
    public async Task OnlyEntriesProvidedByPublicProductProjectionAreGenerated()
    {
        var publicProducts = Products(2);
        var source = new FakeDataSource(publicProducts, []);
        source.NonPublicCandidates.AddRange([
            new ProductSitemapEntry(Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff0"), "inactive", DateTimeOffset.UtcNow),
            new ProductSitemapEntry(Guid.Parse("ffffffff-ffff-ffff-ffff-fffffffffff1"), "deleted", DateTimeOffset.UtcNow),
        ]);
        var service = CreateService(source).Service;
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));
        var xml = string.Join("", Directory.GetFiles(ActiveDirectory(), "products-*.xml").Select(File.ReadAllText));
        Assert.DoesNotContain("inactive", xml);
        Assert.DoesNotContain("deleted", xml);
        Assert.Equal(2, ProductFileUrlCounts().Sum());
    }

    [Fact]
    public async Task ProductUrlUsesCanonicalSlugAndEscapesPathSegment()
    {
        var product = new ProductSitemapEntry(Guid.Empty, "карта / one", DateTimeOffset.Parse("2026-09-18T12:30:00Z"));
        var (service, _) = CreateService([product]);
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));
        var document = XDocument.Load(ActiveFile("products-0001.xml"));
        var location = document.Root!.Element(Ns + "url")!.Element(Ns + "loc")!.Value;
        Assert.Equal("https://the-get.ru/products/%D0%BA%D0%B0%D1%80%D1%82%D0%B0%20%2F%20one", location);
    }

    [Fact]
    public async Task LastModifiedComesFromProductProjection()
    {
        var modified = DateTimeOffset.Parse("2026-09-18T12:30:00Z");
        var (service, _) = CreateService([new ProductSitemapEntry(Guid.Empty, "card", modified)]);
        Assert.True(await service.TryRegenerateAsync("test", CancellationToken.None));
        var document = XDocument.Load(ActiveFile("products-0001.xml"));
        Assert.Equal("2026-09-18T12:30:00Z", document.Root!.Element(Ns + "url")!.Element(Ns + "lastmod")!.Value);
    }

    [Fact]
    public async Task FailedGenerationKeepsPreviousSuccessfulGenerationActive()
    {
        var (service, source) = CreateService(Products(2));
        Assert.True(await service.TryRegenerateAsync("first", CancellationToken.None));
        var activeBefore = File.ReadAllText(Path.Combine(_root, "active"));
        source.ThrowOnRead = true;

        Assert.False(await service.TryRegenerateAsync("failure", CancellationToken.None));
        Assert.Equal(activeBefore, File.ReadAllText(Path.Combine(_root, "active")));
        Assert.True(File.Exists(ActiveFile("sitemap.xml")));
        Assert.NotNull(service.GetStatus().LastError);
    }

    [Fact]
    public async Task ConcurrentGenerationDoesNotStartTwice()
    {
        var source = new FakeDataSource(Products(2), []) { BlockFirstRead = true };
        var service = CreateService(source).Service;
        var first = service.TryRegenerateAsync("first", CancellationToken.None);
        await source.ReadStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.False(await service.TryRegenerateAsync("second", CancellationToken.None));
        source.ReleaseRead.TrySetResult();
        Assert.True(await first);
        Assert.Equal(1, source.ConcurrentReadStarts);
    }

    public void Dispose()
    {
        foreach (var provider in _providers) provider.Dispose();
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }

    private (SitemapGenerationService Service, FakeDataSource Source) CreateService(
        IReadOnlyList<ProductSitemapEntry> products,
        int productsPerFile = 20_000,
        int maxUrls = 50_000,
        long maxBytes = 40L * 1024 * 1024) =>
        CreateService(new FakeDataSource(products, []), productsPerFile, maxUrls, maxBytes);

    private (SitemapGenerationService Service, FakeDataSource Source) CreateService(
        FakeDataSource source,
        int productsPerFile = 20_000,
        int maxUrls = 50_000,
        long maxBytes = 40L * 1024 * 1024)
    {
        var services = new ServiceCollection();
        services.AddScoped<ISitemapDataSource>(_ => source);
        var provider = services.BuildServiceProvider();
        _providers.Add(provider);
        var options = Options.Create(new SitemapOptions
        {
            StoragePath = _root,
            PublicBaseUrl = "https://the-get.ru",
            ProductsPerFile = productsPerFile,
            DatabaseBatchSize = 2,
            MaxUrlsPerFile = maxUrls,
            MaxUncompressedBytes = maxBytes,
            RetainedGenerations = 3,
        });
        var service = new SitemapGenerationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            options,
            NullLogger<SitemapGenerationService>.Instance);
        return (service, source);
    }

    private string ActiveDirectory()
    {
        var id = File.ReadAllText(Path.Combine(_root, "active")).Trim();
        return Path.Combine(_root, "generations", id);
    }

    private string ActiveFile(string fileName) => Path.Combine(ActiveDirectory(), fileName);

    private int[] ProductFileUrlCounts() => Directory.GetFiles(ActiveDirectory(), "products-*.xml")
        .OrderBy(path => path)
        .Select(path => XDocument.Load(path).Root!.Elements(Ns + "url").Count())
        .ToArray();

    private static IReadOnlyList<ProductSitemapEntry> Products(int count, int slugLength = 8) =>
        Enumerable.Range(1, count)
            .Select(index => new ProductSitemapEntry(
                Guid.Parse($"00000000-0000-0000-0000-{index:000000000000}"),
                $"product-{index:0000}-" + new string('x', slugLength),
                DateTimeOffset.Parse("2026-09-18T12:30:00Z").AddMinutes(index)))
            .ToList();

    private sealed class FakeDataSource : ISitemapDataSource
    {
        private readonly IReadOnlyList<ProductSitemapEntry> _products;
        private readonly IReadOnlyList<CategorySitemapEntry> _categories;
        private int _readStarts;

        public FakeDataSource(
            IReadOnlyList<ProductSitemapEntry> products,
            IReadOnlyList<CategorySitemapEntry> categories)
        {
            _products = products.OrderBy(product => product.Id).ToList();
            _categories = categories;
        }

        public bool ThrowOnRead { get; set; }
        public bool BlockFirstRead { get; set; }
        public List<ProductSitemapEntry> NonPublicCandidates { get; } = [];
        public TaskCompletionSource ReadStarted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource ReleaseRead { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public int ConcurrentReadStarts => _readStarts;

        public async Task<IReadOnlyList<ProductSitemapEntry>> ReadProductBatchAsync(
            Guid? afterId,
            int batchSize,
            CancellationToken cancellationToken)
        {
            if (ThrowOnRead) throw new InvalidOperationException("simulated database failure");
            var generationStart = !afterId.HasValue ? Interlocked.Increment(ref _readStarts) : _readStarts;
            if (BlockFirstRead && generationStart == 1 && !afterId.HasValue)
            {
                ReadStarted.TrySetResult();
                await ReleaseRead.Task.WaitAsync(cancellationToken);
            }
            return _products.Where(product => !afterId.HasValue || product.Id.CompareTo(afterId.Value) > 0)
                .Take(batchSize)
                .ToList();
        }

        public Task<IReadOnlyList<CategorySitemapEntry>> ReadCategoriesAsync(CancellationToken cancellationToken) =>
            Task.FromResult(_categories);
    }
}
