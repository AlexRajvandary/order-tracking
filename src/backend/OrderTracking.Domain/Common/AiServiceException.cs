namespace OrderTracking.Domain.Common;

/// <summary>
/// User-facing failure while calling an external AI provider.
/// </summary>
public sealed class AiServiceException : Exception
{
    public AiServiceException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
