using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Attachments.GetStatusAttachment;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/attachments")]
public sealed class AttachmentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AttachmentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAttachment(Guid id, CancellationToken cancellationToken)
    {
        var file = await _mediator.Send(new GetStatusAttachmentQuery(id), cancellationToken);
        return File(file.Content, file.ContentType, enableRangeProcessing: true);
    }
}
