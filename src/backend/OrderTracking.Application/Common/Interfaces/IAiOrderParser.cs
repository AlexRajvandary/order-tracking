using OrderTracking.Application.Orders.AiParse;

namespace OrderTracking.Application.Common.Interfaces;

public interface IAiOrderParser
{
    Task<AiOrderDraft> ParseAsync(
        string? text,
        Stream? image,
        string? imageContentType,
        CancellationToken cancellationToken);
}
