namespace OrderTracking.Infrastructure.Ai;

public sealed class OpenAiSettings
{
    public const string SectionName = "OpenAI";

    /// <summary>API key. Prefer env OPENAI_API_KEY / OpenAI__ApiKey. Never commit a real key.</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Model with vision + structured outputs. Override via OPENAI_MODEL.</summary>
    public string Model { get; set; } = "gpt-4o-mini";

    public int TimeoutSeconds { get; set; } = 90;
}
