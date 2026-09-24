using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ZozoEnrichmentTester.Configuration;
using ZozoEnrichmentTester.Models;
using ZozoEnrichmentTester.Services;

try
{
    var cli = CliOptions.Parse(args);
    var configuration = new ConfigurationBuilder()
        .SetBasePath(AppContext.BaseDirectory)
        .AddJsonFile("appsettings.json", optional: false)
        .Build();
    var section = configuration.GetSection("Zozo");
    var options = new ZozoOptions
    {
        CdpEndpoint = cli.CdpEndpoint ?? section["CdpEndpoint"] ?? "http://127.0.0.1:9222",
        DatabasePath = section["DatabasePath"] ?? "data/zozo-enrichment.db",
        ApiKey = section["ApiKey"] ?? throw new InvalidOperationException("Zozo:ApiKey is missing."),
        DelayBetweenProductsMs = cli.DelayMs ?? int.Parse(section["DelayBetweenProductsMs"] ?? "2500"),
        RequestTimeoutMs = int.Parse(section["RequestTimeoutMs"] ?? "60000"),
        MaxConsecutiveBlocks = int.Parse(section["MaxConsecutiveBlocks"] ?? "3"),
    };

    using var cancellation = new CancellationTokenSource();
    var stopRequested = false;
    var interruptCount = 0;
    Console.CancelKeyPress += (_, eventArgs) =>
    {
        eventArgs.Cancel = true;
        stopRequested = true;
        if (Interlocked.Increment(ref interruptCount) > 1)
            cancellation.Cancel();
        Console.WriteLine(interruptCount == 1
            ? "Stopping after the current product is saved; press Ctrl+C again to cancel immediately..."
            : "Cancelling immediately...");
    };

    var database = new ZozoDatabase(options.DatabasePath);
    await database.InitializeAsync(cancellation.Token);
    Console.WriteLine($"Database: {database.DatabasePath}");

    if (cli.InputPath is null && !cli.Resume)
    {
        await database.ExportAllAsync(cli.ExportAllPath!, cancellation.Token);
        Console.WriteLine($"Exported the complete corpus: {cli.ExportAllPath}");
        await PrintDatabaseTotalsAsync(database, cancellation.Token);
        return;
    }

    long? importId = null;
    List<ProcessingProduct> work;
    if (cli.InputPath is not null)
    {
        var rows = CsvInputService.Read(cli.InputPath);
        var registration = await database.RegisterImportAsync(cli.InputPath, rows, cancellation.Token);
        importId = registration.ImportId;
        Console.WriteLine($"Import #{registration.ImportId}: rows={registration.TotalRows}, unique IDs={registration.UniqueRows}, new={registration.NewProducts}, already completed={registration.AlreadyCompleted}");
        foreach (var change in registration.UrlChanges) Console.WriteLine($"URL updated: {change}");
        foreach (var duplicate in registration.DuplicateUrls) Console.WriteLine($"Notice: multiple product IDs use the same URL: {duplicate}");
        work = await database.GetImportWorkAsync(registration.ImportId, cli.Force, cli.RetryErrors, cli.Limit, cancellation.Token);
    }
    else
    {
        work = await database.GetResumeWorkAsync(cli.RetryErrors, cli.Limit, cancellation.Token);
        Console.WriteLine($"Resume mode: selected {work.Count} product(s).");
    }

    if (work.Count == 0)
    {
        if (importId is not null)
            await database.FinishImportAsync(importId.Value, new ImportTotals(0, 0, 0, 0), CancellationToken.None);
        await RunExportsAsync(database, cli, importId, CancellationToken.None);
        Console.WriteLine("Nothing to process; completed products were skipped.");
        await PrintDatabaseTotalsAsync(database, CancellationToken.None);
        return;
    }

    var runTimer = Stopwatch.StartNew();
    var success = 0;
    var failed = 0;
    var blocked = 0;
    var consecutiveBlocks = 0;
    try
    {
        await using var browser = new ZozoBrowserClient(options);
        Console.WriteLine($"Connecting CDP at {options.CdpEndpoint}...");
        var session = await browser.InitializeAsync(cancellation.Token);
        Console.WriteLine("Connected to Edge CDP: yes");
        Console.WriteLine($"Contexts: {session.ContextCount}");
        Console.WriteLine($"Pages: {session.PageCount}");
        Console.WriteLine($"Selected page: {session.SelectedPageUrl}");
        foreach (var cookie in session.Cookies)
            Console.WriteLine($"Cookie: {cookie.Name} | {cookie.Domain} | {cookie.Path}");
        Console.WriteLine($"ZOZO_UID present: {session.ZozoUidPresent.ToString().ToLowerInvariant()}");

        Console.WriteLine("Testing known BFF endpoint...");
        var bff = await browser.TestKnownBffAsync(cancellation.Token);
        Console.WriteLine($"Known BFF status: {bff.Status}");
        Console.WriteLine($"Known BFF response length: {bff.ResponseLength}");
        Console.WriteLine($"Known BFF images count: {bff.ImagesCount}");
        Console.WriteLine($"ZOZO browser API test {(bff.Passed ? "PASSED" : "FAILED")}");
        if (!bff.Passed)
        {
            Console.Error.WriteLine("Batch was not started because the known BFF acceptance test failed.");
            Environment.ExitCode = 2;
            return;
        }

        var parser = new ZozoProductParser(browser, cli.SaveFailedHtml);
        for (var index = 0; index < work.Count && !stopRequested && !cancellation.IsCancellationRequested; index++)
        {
            var item = work[index];
            Console.WriteLine();
            Console.WriteLine($"Processing {item.ProductId}...");
            var itemTimer = Stopwatch.StartNew();
            await database.MarkProcessingAsync(item.ProductId, CancellationToken.None);
            var result = await parser.ParseAsync(new InputProduct { Id = item.ProductId, Url = item.SourceUrl }, cancellation.Token);
            await database.SaveResultAsync(result, CancellationToken.None);

            if (result.IsBlocked)
            {
                blocked++;
                consecutiveBlocks++;
            }
            else if (string.IsNullOrWhiteSpace(result.Output.Error))
            {
                success++;
                consecutiveBlocks = 0;
            }
            else
            {
                failed++;
                consecutiveBlocks = 0;
            }

            var status = string.IsNullOrWhiteSpace(result.Output.Error)
                ? $"OK - {JsonCount(result.Output.Photos)} photos - {JsonCount(result.Output.Colors)} colors - {JsonCount(result.Output.Sizes)} sizes"
                : $"ERROR {result.Output.Error}";
            Console.WriteLine($"[{index + 1}/{work.Count}] {item.ProductId} - {status} - {itemTimer.Elapsed.TotalSeconds:F2}s");

            if (consecutiveBlocks >= options.MaxConsecutiveBlocks)
            {
                Console.WriteLine($"Stopped after {consecutiveBlocks} consecutive ZOZO/Akamai blocks.");
                break;
            }
            if (index + 1 < work.Count && !stopRequested && options.DelayBetweenProductsMs > 0)
                await Task.Delay(options.DelayBetweenProductsMs, cancellation.Token);
        }
    }
    finally
    {
        var totals = new ImportTotals(success + failed + blocked, success, failed, blocked);
        if (importId is not null)
            await database.FinishImportAsync(importId.Value, totals, CancellationToken.None);
        await RunExportsAsync(database, cli, importId, CancellationToken.None);

        Console.WriteLine();
        Console.WriteLine($"Processed: {totals.Processed}");
        Console.WriteLine($"Success: {success}");
        Console.WriteLine($"Failed: {failed}");
        Console.WriteLine($"Blocked: {blocked}");
        Console.WriteLine($"Remaining from selected work: {Math.Max(0, work.Count - totals.Processed)}");
        Console.WriteLine($"Elapsed: {runTimer.Elapsed:hh\\:mm\\:ss}");
        Console.WriteLine($"Average: {(totals.Processed == 0 ? 0 : runTimer.Elapsed.TotalSeconds / totals.Processed):F2} sec/product");
        await PrintDatabaseTotalsAsync(database, CancellationToken.None);
    }
}
catch (CliHelpException)
{
    Console.WriteLine(CliOptions.Usage);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Cancelled. Completed rows are already saved; a Processing row is eligible for --resume.");
}
catch (CdpConnectionException exception)
{
    Console.Error.WriteLine(exception.Message);
    Console.Error.WriteLine();
    Console.Error.WriteLine("Start Edge first using:");
    Console.Error.WriteLine("& \"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe\" `");
    Console.Error.WriteLine("  --remote-debugging-port=9222 `");
    Console.Error.WriteLine("  --user-data-dir=\"C:\\temp\\zozo-edge-profile\" `");
    Console.Error.WriteLine("  \"https://zozo.jp/\"");
    Environment.ExitCode = 1;
}
catch (Exception exception)
{
    Console.Error.WriteLine(exception.Message);
    Console.Error.WriteLine(CliOptions.Usage);
    Environment.ExitCode = 1;
}

static async Task RunExportsAsync(ZozoDatabase database, CliOptions cli, long? importId, CancellationToken cancellationToken)
{
    if (cli.ExportPath is not null && importId is not null)
    {
        await database.ExportImportAsync(importId.Value, cli.ExportPath, cancellationToken);
        Console.WriteLine($"Exported current import: {cli.ExportPath}");
    }
    if (cli.ExportAllPath is not null)
    {
        await database.ExportAllAsync(cli.ExportAllPath, cancellationToken);
        Console.WriteLine($"Exported the complete corpus: {cli.ExportAllPath}");
    }
}

static async Task PrintDatabaseTotalsAsync(ZozoDatabase database, CancellationToken cancellationToken)
{
    var counts = await database.GetStatusCountsAsync(cancellationToken);
    Console.WriteLine("Database statuses: " + (counts.Count == 0
        ? "empty"
        : string.Join(", ", counts.OrderBy(pair => pair.Key).Select(pair => $"{pair.Key}={pair.Value}"))));
}

static int JsonCount(string json)
{
    try { using var document = JsonDocument.Parse(json); return document.RootElement.GetArrayLength(); }
    catch { return 0; }
}
