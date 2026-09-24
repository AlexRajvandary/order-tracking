namespace ZozoEnrichmentTester.Configuration;

public sealed class ZozoOptions
{
    public string CdpEndpoint { get; init; } = "http://127.0.0.1:9222";
    public string DatabasePath { get; init; } = "data/zozo-enrichment.db";
    public string ApiKey { get; init; } = "";
    public int DelayBetweenProductsMs { get; init; } = 1000;
    public int RequestTimeoutMs { get; init; } = 60_000;
    public int MaxConsecutiveBlocks { get; init; } = 3;
}

public sealed record CliOptions(
    string? InputPath,
    string? ExportPath,
    string? ExportAllPath,
    int? Limit,
    bool RetryErrors,
    bool Force,
    bool Resume,
    bool SaveFailedHtml,
    string? CdpEndpoint,
    int? DelayMs)
{
    public static CliOptions Parse(string[] args)
    {
        string? input = null;
        string? export = null;
        string? exportAll = null;
        int? limit = null;
        int? delay = null;
        string? cdpEndpoint = null;
        var retryErrors = false;
        var force = false;
        var resume = false;
        var saveFailedHtml = false;

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--input": input = NextValue(args, ref i, "--input"); break;
                case "--export": export = NextValue(args, ref i, "--export"); break;
                case "--export-all": exportAll = NextValue(args, ref i, "--export-all"); break;
                case "--limit": limit = ParsePositiveInt(NextValue(args, ref i, "--limit"), "--limit"); break;
                case "--delay-ms": delay = ParseNonNegativeInt(NextValue(args, ref i, "--delay-ms"), "--delay-ms"); break;
                case "--cdp-endpoint": cdpEndpoint = NextValue(args, ref i, "--cdp-endpoint"); break;
                case "--retry-errors": retryErrors = true; break;
                case "--force": force = true; break;
                case "--resume": resume = true; break;
                case "--save-failed-html": saveFailedHtml = true; break;
                case "--help":
                case "-h": throw new CliHelpException();
                default: throw new ArgumentException($"Unknown option: {args[i]}");
            }
        }

        if (string.IsNullOrWhiteSpace(input) && !resume && string.IsNullOrWhiteSpace(exportAll))
            throw new ArgumentException("Use --input, --resume, or --export-all.");
        if (!string.IsNullOrWhiteSpace(input) && resume)
            throw new ArgumentException("--input and --resume are separate modes.");
        if (!string.IsNullOrWhiteSpace(export) && string.IsNullOrWhiteSpace(input))
            throw new ArgumentException("--export requires --input so it can export the current import.");

        return new CliOptions(
            input is null ? null : Path.GetFullPath(input),
            export is null ? null : Path.GetFullPath(export),
            exportAll is null ? null : Path.GetFullPath(exportAll),
            limit,
            retryErrors,
            force,
            resume,
            saveFailedHtml,
            cdpEndpoint,
            delay);
    }

    private static string NextValue(string[] args, ref int index, string option) =>
        ++index < args.Length ? args[index] : throw new ArgumentException($"Missing value for {option}.");

    private static int ParsePositiveInt(string value, string option) =>
        int.TryParse(value, out var parsed) && parsed > 0 ? parsed : throw new ArgumentException($"{option} must be a positive integer.");

    private static int ParseNonNegativeInt(string value, string option) =>
        int.TryParse(value, out var parsed) && parsed >= 0 ? parsed : throw new ArgumentException($"{option} must be zero or greater.");

    public static string Usage => "dotnet run -- --input input.csv [--limit 1] [--retry-errors] [--force] [--export output.csv] | --resume | --export-all all.csv";
}

public sealed class CliHelpException : Exception;

public sealed class CdpConnectionException(string message, Exception? innerException = null) : Exception(message, innerException);
