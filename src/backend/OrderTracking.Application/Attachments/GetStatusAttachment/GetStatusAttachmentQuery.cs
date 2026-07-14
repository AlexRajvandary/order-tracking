using MediatR;

namespace OrderTracking.Application.Attachments.GetStatusAttachment;

public sealed record StatusAttachmentFile(Stream Content, string ContentType, string? FileName);

public sealed record GetStatusAttachmentQuery(Guid Id) : IRequest<StatusAttachmentFile>;
