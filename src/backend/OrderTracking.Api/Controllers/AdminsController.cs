using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Admins.BindTelegram;
using OrderTracking.Application.Admins.CreateAdmin;
using OrderTracking.Application.Admins.GetAdmins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Admins.UnbindTelegram;
using OrderTracking.Application.Admins.UpdateAdmin;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/admins")]
[Authorize]
public sealed class AdminsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserDto>>> GetAdmins(CancellationToken cancellationToken)
    {
        return Ok(await _mediator.Send(new GetAdminsQuery(), cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<AdminUserDto>> CreateAdmin(
        [FromBody] CreateAdminRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreateAdminCommand(request.Login, request.Password, request.DisplayName),
            cancellationToken);

        return CreatedAtAction(nameof(GetAdmins), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminUserDto>> UpdateAdmin(
        Guid id,
        [FromBody] UpdateAdminRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new UpdateAdminCommand(id, request.DisplayName, request.IsActive),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:guid}/telegram")]
    public async Task<ActionResult<AdminUserDto>> BindTelegram(
        Guid id,
        [FromBody] BindTelegramRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new BindAdminTelegramCommand(
                id,
                new TelegramLoginData(
                    request.Id,
                    request.FirstName,
                    request.LastName,
                    request.Username,
                    request.PhotoUrl,
                    request.AuthDate,
                    request.Hash)),
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("{id:guid}/telegram")]
    public async Task<ActionResult<AdminUserDto>> UnbindTelegram(
        Guid id,
        CancellationToken cancellationToken)
    {
        return Ok(await _mediator.Send(new UnbindAdminTelegramCommand(id), cancellationToken));
    }
}
