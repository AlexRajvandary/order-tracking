using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Xml;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Products.Infrastructure.Services.Sitemap;

public sealed class SitemapGenerationService
{
    private const string SitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";
    private static readonly byte[] UrlSetHeader = Encoding.UTF8.GetBytes(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
    private static readonly byte[] UrlSetFooter = Encoding.UTF8.GetBytes("</urlset>\n");
    private static readonly byte[] SitemapIndexHeader = Encoding.UTF8.GetBytes(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
    private static readonly byte[] SitemapIndexFooter = Encoding.UTF8.GetBytes("</sitemapindex>\n");

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SitemapOptions _options;
    private readonly ILogger<SitemapGenerationService> _logger;
    private readonly SemaphoreSlim _generationLock = new(1, 1);
    private readonly object _statusLock = new();
    private SitemapGenerationStatus _status;

    public SitemapGenerationService(
        IServiceScopeFactory scopeFactory,
        IOptions<SitemapOptions> options,
        ILogger<SitemapGenerationService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
        _status = LoadInitialStatus();
    }

    private string StorageRoot => Path.GetFullPath(_options.StoragePath);
    private string GenerationsRoot => Path.Combine(StorageRoot, "generations");
    private string ActiveMarkerPath => Path.Combine(StorageRoot, "active");

    public SitemapGenerationStatus GetStatus()
    {
        lock (_statusLock) return _status;
    }

    public void SetQueued(bool queued)
    {
        lock (_statusLock) _status = _status with { IsQueued = queued };
    }

    public async Task<bool> TryRegenerateAsync(string reason, CancellationToken cancellationToken)
    {
        if (!await _generationLock.WaitAsync(0, cancellationToken))
        {
            _logger.LogInformation("Sitemap regeneration skipped because another generation is running. Reason: {Reason}", reason);
            return false;
        }

        var attempt = DateTimeOffset.UtcNow;
        var stopwatch = Stopwatch.StartNew();
        lock (_statusLock)
        {
            _status = _status with
            {
                LastAttempt = attempt,
                IsGenerating = true,
                IsQueued = false,
                LastError = null,
            };
        }

        _logger.LogInformation("Sitemap regeneration started. Reason: {Reason}", reason);
        string? temporaryDirectory = null;

        try
        {
            Directory.CreateDirectory(StorageRoot);
            Directory.CreateDirectory(GenerationsRoot);
            var generationId = $"{attempt:yyyyMMddHHmmss}-{Guid.NewGuid():N}";
            temporaryDirectory = Path.Combine(GenerationsRoot, $"{generationId}.tmp");
            var finalDirectory = Path.Combine(GenerationsRoot, generationId);
            Directory.CreateDirectory(temporaryDirectory);

            using var scope = _scopeFactory.CreateScope();
            var dataSource = scope.ServiceProvider.GetRequiredService<ISitemapDataSource>();

            var generatedAt = DateTimeOffset.UtcNow;
            var files = new List<SitemapFileInfo>();
            files.Add(await WriteStaticSitemapAsync(temporaryDirectory, generatedAt, cancellationToken));

            var categories = await dataSource.ReadCategoriesAsync(cancellationToken);
            files.Add(await WriteCategorySitemapAsync(temporaryDirectory, categories, generatedAt, cancellationToken));

            var productResult = await WriteProductSitemapsAsync(
                temporaryDirectory,
                dataSource,
                generatedAt,
                cancellationToken);
            files.AddRange(productResult.Files);

            var index = await WriteIndexAsync(temporaryDirectory, files, generatedAt, cancellationToken);
            files.Add(index);

            foreach (var file in files)
                ValidateXmlFile(Path.Combine(temporaryDirectory, file.FileName), file.FileName == "sitemap.xml");

            stopwatch.Stop();
            var manifest = new SitemapGenerationManifest(
                generationId,
                generatedAt,
                productResult.ProductCount,
                productResult.Files.Count,
                files.Single(file => file.FileName == "categories.xml").UrlCount,
                files.Where(file => file.FileName != "sitemap.xml").Sum(file => file.UrlCount),
                files.Sum(file => file.Bytes),
                productResult.DatabaseBatchCount,
                stopwatch.ElapsedMilliseconds,
                files);

            await WriteManifestAsync(temporaryDirectory, manifest, cancellationToken);
            Directory.Move(temporaryDirectory, finalDirectory);
            temporaryDirectory = null;
            await SwitchActiveGenerationAsync(generationId, cancellationToken);
            CleanupOldGenerations(generationId);

            lock (_statusLock)
            {
                _status = new SitemapGenerationStatus(
                    generatedAt,
                    attempt,
                    false,
                    false,
                    manifest.ProductCount,
                    manifest.ProductSitemapCount,
                    manifest.TotalUrls,
                    manifest.TotalBytes,
                    manifest.DatabaseBatchCount,
                    manifest.DurationMs,
                    null);
            }

            _logger.LogInformation(
                "Sitemap regeneration completed. Products: {ProductCount}; product sitemap files: {ProductSitemapCount}; total URLs: {TotalUrls}; total XML bytes: {TotalBytes}; DB batches: {DatabaseBatchCount}; duration: {DurationMs} ms",
                manifest.ProductCount,
                manifest.ProductSitemapCount,
                manifest.TotalUrls,
                manifest.TotalBytes,
                manifest.DatabaseBatchCount,
                manifest.DurationMs);
            return true;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Sitemap regeneration cancelled after {DurationMs} ms", stopwatch.ElapsedMilliseconds);
            throw;
        }
        catch (Exception exception)
        {
            stopwatch.Stop();
            lock (_statusLock)
            {
                _status = _status with
                {
                    IsGenerating = false,
                    IsQueued = false,
                    DurationMs = stopwatch.ElapsedMilliseconds,
                    LastError = exception.Message,
                };
            }
            _logger.LogError(exception, "Sitemap regeneration failed after {DurationMs} ms. Reason: {Reason}", stopwatch.ElapsedMilliseconds, reason);
            return false;
        }
        finally
        {
            if (temporaryDirectory is not null && Directory.Exists(temporaryDirectory))
            {
                try { Directory.Delete(temporaryDirectory, recursive: true); }
                catch (Exception cleanupException) { _logger.LogWarning(cleanupException, "Failed to remove incomplete sitemap generation {Directory}", temporaryDirectory); }
            }

            lock (_statusLock) _status = _status with { IsGenerating = false };
            _generationLock.Release();
        }
    }

    public SitemapStoredFile? TryOpenActiveFile(string fileName)
    {
        if (!IsAllowedFileName(fileName) || !File.Exists(ActiveMarkerPath)) return null;

        var generationId = File.ReadAllText(ActiveMarkerPath, Encoding.UTF8).Trim();
        if (string.IsNullOrWhiteSpace(generationId)) return null;

        var generationsRoot = Path.GetFullPath(GenerationsRoot) + Path.DirectorySeparatorChar;
        var generationDirectory = Path.GetFullPath(Path.Combine(GenerationsRoot, generationId));
        if (!generationDirectory.StartsWith(generationsRoot, StringComparison.Ordinal)) return null;

        var path = Path.Combine(generationDirectory, fileName);
        if (!File.Exists(path)) return null;

        var info = new FileInfo(path);
        var stream = new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete,
            bufferSize: 64 * 1024,
            options: FileOptions.Asynchronous | FileOptions.SequentialScan);
        var lastModified = new DateTimeOffset(info.LastWriteTimeUtc, TimeSpan.Zero);
        var etag = $"\"{info.Length:x}-{info.LastWriteTimeUtc.Ticks:x}\"";
        return new SitemapStoredFile(stream, info.Length, lastModified, etag);
    }

    private async Task<SitemapFileInfo> WriteStaticSitemapAsync(
        string directory,
        DateTimeOffset generatedAt,
        CancellationToken cancellationToken)
    {
        var urls = new[]
        {
            new UrlEntry(BuildPublicUrl("/"), null, "daily", "1.0"),
            new UrlEntry(BuildPublicUrl("/catalog/all"), null, "daily", "0.9"),
            new UrlEntry(BuildPublicUrl("/find-product"), null, "monthly", "0.6"),
            new UrlEntry(BuildPublicUrl("/individual-request"), null, "monthly", "0.6"),
            new UrlEntry(BuildPublicUrl("/auction-request"), null, "monthly", "0.6"),
            new UrlEntry(BuildPublicUrl("/ticket-request"), null, "monthly", "0.6"),
            new UrlEntry(BuildPublicUrl("/item-weight"), null, "monthly", "0.5"),
        };
        return await WriteUrlSetAsync(directory, "static.xml", urls, generatedAt, cancellationToken);
    }

    private async Task<SitemapFileInfo> WriteCategorySitemapAsync(
        string directory,
        IReadOnlyList<CategorySitemapEntry> categories,
        DateTimeOffset generatedAt,
        CancellationToken cancellationToken)
    {
        var byParent = categories
            .Where(category => category.ParentId.HasValue)
            .GroupBy(category => category.ParentId!.Value)
            .ToDictionary(group => group.Key, group => group.ToList());
        var totalCounts = new Dictionary<Guid, int>();
        int CountSubtree(Guid id)
        {
            if (totalCounts.TryGetValue(id, out var existing)) return existing;
            var direct = categories.First(category => category.Id == id).DirectProductCount;
            var children = byParent.GetValueOrDefault(id) ?? [];
            return totalCounts[id] = direct + children.Sum(child => CountSubtree(child.Id));
        }

        var urls = new List<UrlEntry>();
        foreach (var root in categories.Where(category => category.ParentId is null).OrderBy(category => category.Slug))
        {
            urls.Add(new UrlEntry(
                BuildPublicUrl($"/catalog/{EscapePathSegment(root.Slug)}"),
                root.LastModified,
                "daily",
                "0.8"));

            foreach (var child in (byParent.GetValueOrDefault(root.Id) ?? []).Where(child => CountSubtree(child.Id) > 0).OrderBy(child => child.Slug))
            {
                urls.Add(new UrlEntry(
                    BuildPublicUrl($"/catalog/{EscapePathSegment(root.Slug)}/{EscapePathSegment(child.Slug)}"),
                    child.LastModified,
                    "daily",
                    "0.7"));
            }
        }

        return await WriteUrlSetAsync(directory, "categories.xml", urls, generatedAt, cancellationToken);
    }

    private async Task<ProductGenerationResult> WriteProductSitemapsAsync(
        string directory,
        ISitemapDataSource dataSource,
        DateTimeOffset generatedAt,
        CancellationToken cancellationToken)
    {
        var files = new List<SitemapFileInfo>();
        ProductChunkWriter? writer = null;
        Guid? lastId = null;
        var productCount = 0;
        var batchCount = 0;

        try
        {
            while (true)
            {
                var batch = await dataSource.ReadProductBatchAsync(lastId, _options.DatabaseBatchSize, cancellationToken);
                if (batch.Count == 0) break;
                batchCount++;

                foreach (var product in batch)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var entry = SerializeUrlEntry(new UrlEntry(
                        BuildPublicUrl($"/products/{EscapePathSegment(product.Slug)}"),
                        product.LastModified,
                        "weekly",
                        "0.6"));

                    writer ??= await OpenProductChunkAsync(directory, files.Count + 1, cancellationToken);
                    if (!writer.CanFit(entry.Length, _options))
                        throw new InvalidOperationException("A single product sitemap entry exceeds Sitemap:MaxUncompressedBytes.");
                    if (writer.ShouldRotate(entry.Length, _options))
                    {
                        files.Add(await writer.CompleteAsync(generatedAt, cancellationToken));
                        await writer.DisposeAsync();
                        writer = await OpenProductChunkAsync(directory, files.Count + 1, cancellationToken);
                    }

                    await writer.WriteEntryAsync(entry, cancellationToken);
                    productCount++;
                }

                lastId = batch[^1].Id;
            }

            if (writer is not null && writer.UrlCount > 0)
                files.Add(await writer.CompleteAsync(generatedAt, cancellationToken));
        }
        finally
        {
            if (writer is not null) await writer.DisposeAsync();
        }

        return new ProductGenerationResult(files, productCount, batchCount);
    }

    private async Task<ProductChunkWriter> OpenProductChunkAsync(
        string directory,
        int number,
        CancellationToken cancellationToken)
    {
        var fileName = $"products-{number:0000}.xml";
        var writer = new ProductChunkWriter(Path.Combine(directory, fileName), fileName);
        await writer.InitializeAsync(cancellationToken);
        return writer;
    }

    private async Task<SitemapFileInfo> WriteIndexAsync(
        string directory,
        IReadOnlyList<SitemapFileInfo> childFiles,
        DateTimeOffset generatedAt,
        CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, "sitemap.xml");
        await using var stream = NewOutputStream(path);
        await stream.WriteAsync(SitemapIndexHeader, cancellationToken);
        foreach (var file in childFiles)
        {
            var fragment = SerializeSitemapIndexEntry(
                BuildPublicUrl($"/sitemaps/{file.FileName}"),
                file.LastModified);
            await stream.WriteAsync(fragment, cancellationToken);
        }
        await stream.WriteAsync(SitemapIndexFooter, cancellationToken);
        await stream.FlushAsync(cancellationToken);
        stream.Flush(flushToDisk: true);
        return new SitemapFileInfo("sitemap.xml", childFiles.Count, stream.Length, generatedAt);
    }

    private async Task<SitemapFileInfo> WriteUrlSetAsync(
        string directory,
        string fileName,
        IEnumerable<UrlEntry> urls,
        DateTimeOffset generatedAt,
        CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, fileName);
        await using var stream = NewOutputStream(path);
        await stream.WriteAsync(UrlSetHeader, cancellationToken);
        var count = 0;
        foreach (var url in urls)
        {
            var fragment = SerializeUrlEntry(url);
            if (stream.Length + fragment.Length + UrlSetFooter.Length > _options.MaxUncompressedBytes)
                throw new InvalidOperationException($"{fileName} exceeds Sitemap:MaxUncompressedBytes.");
            await stream.WriteAsync(fragment, cancellationToken);
            count++;
        }
        await stream.WriteAsync(UrlSetFooter, cancellationToken);
        await stream.FlushAsync(cancellationToken);
        stream.Flush(flushToDisk: true);
        return new SitemapFileInfo(fileName, count, stream.Length, generatedAt);
    }

    private async Task WriteManifestAsync(
        string directory,
        SitemapGenerationManifest manifest,
        CancellationToken cancellationToken)
    {
        await using var stream = NewOutputStream(Path.Combine(directory, "manifest.json"));
        await JsonSerializer.SerializeAsync(stream, manifest, cancellationToken: cancellationToken);
        await stream.FlushAsync(cancellationToken);
        stream.Flush(flushToDisk: true);
    }

    private async Task SwitchActiveGenerationAsync(string generationId, CancellationToken cancellationToken)
    {
        var temporaryMarker = Path.Combine(StorageRoot, $"active.{Guid.NewGuid():N}.tmp");
        await File.WriteAllTextAsync(temporaryMarker, generationId, new UTF8Encoding(false), cancellationToken);
        File.Move(temporaryMarker, ActiveMarkerPath, overwrite: true);
    }

    private void CleanupOldGenerations(string activeGenerationId)
    {
        try
        {
            var retained = Math.Max(2, _options.RetainedGenerations);
            var directories = new DirectoryInfo(GenerationsRoot)
                .EnumerateDirectories()
                .Where(directory => !directory.Name.EndsWith(".tmp", StringComparison.Ordinal))
                .OrderByDescending(directory => directory.CreationTimeUtc)
                .ToList();

            foreach (var directory in directories.Skip(retained))
            {
                if (directory.Name != activeGenerationId) directory.Delete(recursive: true);
            }
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Failed to clean old sitemap generations");
        }
    }

    private SitemapGenerationStatus LoadInitialStatus()
    {
        try
        {
            if (!File.Exists(ActiveMarkerPath)) return EmptyStatus();
            var id = File.ReadAllText(ActiveMarkerPath, Encoding.UTF8).Trim();
            var path = Path.Combine(GenerationsRoot, id, "manifest.json");
            if (!File.Exists(path)) return EmptyStatus();
            var manifest = JsonSerializer.Deserialize<SitemapGenerationManifest>(File.ReadAllText(path, Encoding.UTF8));
            if (manifest is null) return EmptyStatus();
            return new SitemapGenerationStatus(
                manifest.GeneratedAt,
                null,
                false,
                false,
                manifest.ProductCount,
                manifest.ProductSitemapCount,
                manifest.TotalUrls,
                manifest.TotalBytes,
                manifest.DatabaseBatchCount,
                manifest.DurationMs,
                null);
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Could not load sitemap generation status");
            return EmptyStatus();
        }
    }

    private static SitemapGenerationStatus EmptyStatus() =>
        new(null, null, false, false, 0, 0, 0, 0, 0, null, null);

    private string BuildPublicUrl(string path) => $"{_options.PublicBaseUrl.TrimEnd('/')}{path}";

    private static string EscapePathSegment(string value) => Uri.EscapeDataString(value);

    private static bool IsAllowedFileName(string fileName) =>
        fileName is "sitemap.xml" or "static.xml" or "categories.xml"
        || (fileName.StartsWith("products-", StringComparison.Ordinal)
            && fileName.EndsWith(".xml", StringComparison.Ordinal)
            && fileName[9..^4].Length == 4
            && fileName[9..^4].All(char.IsDigit));

    private static FileStream NewOutputStream(string path) => new(
        path,
        FileMode.CreateNew,
        FileAccess.Write,
        FileShare.None,
        bufferSize: 64 * 1024,
        options: FileOptions.Asynchronous | FileOptions.SequentialScan);

    private static byte[] SerializeUrlEntry(UrlEntry entry) => SerializeFragment(writer =>
    {
        writer.WriteStartElement("url");
        writer.WriteElementString("loc", entry.Location);
        if (entry.LastModified.HasValue)
            writer.WriteElementString("lastmod", entry.LastModified.Value.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"));
        if (entry.ChangeFrequency is not null) writer.WriteElementString("changefreq", entry.ChangeFrequency);
        if (entry.Priority is not null) writer.WriteElementString("priority", entry.Priority);
        writer.WriteEndElement();
    });

    private static byte[] SerializeSitemapIndexEntry(string location, DateTimeOffset lastModified) => SerializeFragment(writer =>
    {
        writer.WriteStartElement("sitemap");
        writer.WriteElementString("loc", location);
        writer.WriteElementString("lastmod", lastModified.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"));
        writer.WriteEndElement();
    });

    private static byte[] SerializeFragment(Action<XmlWriter> write)
    {
        using var stream = new MemoryStream(512);
        using (var writer = XmlWriter.Create(stream, new XmlWriterSettings
        {
            Encoding = new UTF8Encoding(false),
            ConformanceLevel = ConformanceLevel.Fragment,
            OmitXmlDeclaration = true,
            Indent = false,
            CloseOutput = false,
        }))
        {
            write(writer);
        }
        stream.WriteByte((byte)'\n');
        return stream.ToArray();
    }

    private static void ValidateXmlFile(string path, bool expectIndex)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var reader = XmlReader.Create(stream, new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Prohibit,
            IgnoreComments = true,
        });
        reader.MoveToContent();
        var expectedRoot = expectIndex ? "sitemapindex" : "urlset";
        if (reader.LocalName != expectedRoot || reader.NamespaceURI != SitemapNamespace)
            throw new InvalidDataException($"{Path.GetFileName(path)} has invalid root element.");
    }

    private sealed record UrlEntry(
        string Location,
        DateTimeOffset? LastModified,
        string? ChangeFrequency,
        string? Priority);

    private sealed record ProductGenerationResult(
        IReadOnlyList<SitemapFileInfo> Files,
        int ProductCount,
        int DatabaseBatchCount);

    private sealed class ProductChunkWriter : IAsyncDisposable
    {
        private readonly FileStream _stream;
        private readonly string _fileName;
        private bool _completed;

        public ProductChunkWriter(string path, string fileName)
        {
            _stream = NewOutputStream(path);
            _fileName = fileName;
        }

        public int UrlCount { get; private set; }

        public async Task InitializeAsync(CancellationToken cancellationToken) =>
            await _stream.WriteAsync(UrlSetHeader, cancellationToken);

        public bool ShouldRotate(int nextEntryBytes, SitemapOptions options) =>
            UrlCount > 0
            && (UrlCount >= options.ProductsPerFile
                || UrlCount >= options.MaxUrlsPerFile
                || _stream.Length + nextEntryBytes + UrlSetFooter.Length > options.MaxUncompressedBytes);

        public bool CanFit(int nextEntryBytes, SitemapOptions options) =>
            UrlSetHeader.Length + nextEntryBytes + UrlSetFooter.Length <= options.MaxUncompressedBytes;

        public async Task WriteEntryAsync(byte[] entry, CancellationToken cancellationToken)
        {
            await _stream.WriteAsync(entry, cancellationToken);
            UrlCount++;
        }

        public async Task<SitemapFileInfo> CompleteAsync(
            DateTimeOffset generatedAt,
            CancellationToken cancellationToken)
        {
            if (!_completed)
            {
                await _stream.WriteAsync(UrlSetFooter, cancellationToken);
                await _stream.FlushAsync(cancellationToken);
                _stream.Flush(flushToDisk: true);
                _completed = true;
            }
            return new SitemapFileInfo(_fileName, UrlCount, _stream.Length, generatedAt);
        }

        public async ValueTask DisposeAsync() => await _stream.DisposeAsync();
    }
}
