using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OrderTracking.Domain.Common;
using OrderTracking.Infrastructure.Ai;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class OpenAiOrderParserErrorTests
{
    [Fact]
    public async Task ParseAsync_WhenApiKeyMissing_ThrowsAiServiceException()
    {
        var parser = new OpenAiOrderParser(
            Options.Create(new OpenAiSettings { ApiKey = "", Model = "gpt-4o-mini" }),
            NullLogger<OpenAiOrderParser>.Instance);

        var ex = await Assert.ThrowsAsync<AiServiceException>(() =>
            parser.ParseAsync("text only", null, null, CancellationToken.None));

        Assert.Contains("OPENAI_API_KEY", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ParseAsync_WhenNoInput_ThrowsDomainException()
    {
        var parser = new OpenAiOrderParser(
            Options.Create(new OpenAiSettings { ApiKey = "sk-test", Model = "gpt-4o-mini" }),
            NullLogger<OpenAiOrderParser>.Instance);

        await Assert.ThrowsAsync<DomainException>(() =>
            parser.ParseAsync("  ", null, null, CancellationToken.None));
    }
}
