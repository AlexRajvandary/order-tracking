using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Attachments.GetStatusAttachment;

public sealed class GetStatusAttachmentQueryHandler
    : IRequestHandler<GetStatusAttachmentQuery, StatusAttachmentFile>
{
    private readonly IApplicationDbContext _context;
    private readonly IObjectStorage _objectStorage;

    public GetStatusAttachmentQueryHandler(
        IApplicationDbContext context,
        IObjectStorage objectStorage)
    {
        _context = context;
        _objectStorage = objectStorage;
    }

    public async Task<StatusAttachmentFile> Handle(
        GetStatusAttachmentQuery request,
        CancellationToken cancellationToken)
    {
        var attachment = await _context.OrderItemStatusAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Attachment '{request.Id}' was not found");

        var stream = await _objectStorage.GetAsync(attachment.ObjectKey, cancellationToken);
        return new StatusAttachmentFile(stream, attachment.ContentType, attachment.OriginalFileName);
    }
}
