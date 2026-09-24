using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using ZozoEnrichmentTester.Models;

namespace ZozoEnrichmentTester.Services;

public static class CsvInputService
{
    public static List<InputProduct> Read(string path)
    {
        using var reader = new StreamReader(path, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        return csv.GetRecords<InputProduct>()
            .Select(row => new InputProduct { Id = row.Id.Trim(), Url = row.Url.Trim() })
            .Where(row => row.Id.Length > 0 && row.Url.Length > 0)
            .ToList();
    }
}

public static class CsvOutputService
{
    private static readonly UTF8Encoding Utf8Bom = new(encoderShouldEmitUTF8Identifier: true);

    public static async Task WriteExportAsync(string path, IEnumerable<OutputProduct> rows, CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
        await using var stream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 4096, useAsync: true);
        await using var writer = new StreamWriter(stream, Utf8Bom);
        await using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture) { NewLine = "\r\n" });
        await csv.WriteRecordsAsync(rows, cancellationToken);
    }
}
