using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Orders.AiParse;

public sealed class ParseOrderWithAiCommandHandler : IRequestHandler<ParseOrderWithAiCommand, AiOrderDraft>
{
    private readonly IAiOrderParser _parser;

    public ParseOrderWithAiCommandHandler(IAiOrderParser parser)
    {
        _parser = parser;
    }

    public async Task<AiOrderDraft> Handle(ParseOrderWithAiCommand request, CancellationToken cancellationToken)
    {
        Stream? imageStream = null;
        string? contentType = null;

        if (request.Image is not null)
        {
            // Copy so OpenAI can seek; do not persist to storage.
            var copy = new MemoryStream();
            await request.Image.CopyToAsync(copy, cancellationToken);
            copy.Position = 0;
            imageStream = copy;
            contentType = AiOrderParseLimits.NormalizeContentType(request.ImageContentType);
        }

        await using (imageStream)
        {
            return await _parser.ParseAsync(
                string.IsNullOrWhiteSpace(request.Text) ? null : request.Text.Trim(),
                imageStream,
                contentType,
                cancellationToken);
        }
    }
}
