using MediatR;

namespace OrderTracking.Application.Orders.AiParse;

public sealed record ParseOrderWithAiCommand(
    string? Text,
    Stream? Image,
    string? ImageContentType,
    string? ImageFileName,
    long? ImageLength) : IRequest<AiOrderDraft>;
