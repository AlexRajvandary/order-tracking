using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OrderTracking.Api.Auth;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Identity.ChangePassword;
using System.Text.Json;
using OrderTracking.Application.Identity.GetCurrentUser;
using OrderTracking.Application.Identity.Login;
using OrderTracking.Application.Identity.Logout;
using OrderTracking.Application.Identity.RefreshToken;
using OrderTracking.Application.Identity.TelegramLogin;
using OrderTracking.Application.Identity.Heartbeat;
using OrderTracking.Application.Identity.UpdateUserSettings;
using OrderTracking.Infrastructure.Identity;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IHostEnvironment _environment;
    private readonly JwtSettings _jwtSettings;
    private readonly ITelegramAuthValidator _telegramAuth;

    public AuthController(
        IMediator mediator,
        IHostEnvironment environment,
        Microsoft.Extensions.Options.IOptions<JwtSettings> jwtSettings,
        ITelegramAuthValidator telegramAuth)
    {
        _mediator = mediator;
        _environment = environment;
        _jwtSettings = jwtSettings.Value;
        _telegramAuth = telegramAuth;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthTokensDto>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new LoginCommand(request.Login, request.Password, GetIpAddress(), GetUserAgent()),
            cancellationToken);

        SetRefreshCookie(result.RefreshToken);

        return Ok(result.Tokens);
    }

    [HttpPost("telegram")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthTokensDto>> TelegramLogin(
        [FromBody] TelegramLoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new TelegramLoginCommand(
                new TelegramLoginData(
                    request.Id,
                    request.FirstName,
                    request.LastName,
                    request.Username,
                    request.PhotoUrl,
                    request.AuthDate,
                    request.Hash),
                GetIpAddress(),
                GetUserAgent()),
            cancellationToken);

        SetRefreshCookie(result.RefreshToken);

        return Ok(result.Tokens);
    }

    [HttpGet("telegram-config")]
    [AllowAnonymous]
    public ActionResult<TelegramConfigDto> TelegramConfig()
    {
        return Ok(new TelegramConfigDto(
            _telegramAuth.IsConfigured,
            _telegramAuth.BotUsername));
    }

    [HttpPost("heartbeat")]
    [Authorize]
    public async Task<IActionResult> Heartbeat(CancellationToken cancellationToken)
    {
        await _mediator.Send(new HeartbeatCommand(), cancellationToken);
        return NoContent();
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-refresh")]
    public async Task<ActionResult<AuthTokensDto>> Refresh(CancellationToken cancellationToken)
    {
        var refreshToken = AuthCookieHelper.GetRefreshTokenFromRequest(Request);
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized();
        }

        var result = await _mediator.Send(
            new RefreshTokenCommand(refreshToken, GetIpAddress(), GetUserAgent()),
            cancellationToken);

        SetRefreshCookie(result.RefreshToken);

        return Ok(result.Tokens);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var refreshToken = AuthCookieHelper.GetRefreshTokenFromRequest(Request);
        await _mediator.Send(new LogoutCommand(refreshToken), cancellationToken);
        AuthCookieHelper.ClearRefreshTokenCookie(Response, _environment);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken cancellationToken)
    {
        var user = await _mediator.Send(new GetCurrentUserQuery(), cancellationToken);
        return Ok(user);
    }

    [HttpPut("me/settings")]
    [Authorize]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] JsonElement settings,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(new UpdateUserSettingsCommand(settings), cancellationToken);
        return NoContent();
    }

    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(
            new ChangePasswordCommand(request.CurrentPassword, request.NewPassword),
            cancellationToken);

        AuthCookieHelper.ClearRefreshTokenCookie(Response, _environment);
        return NoContent();
    }

    private void SetRefreshCookie(string refreshToken)
    {
        var expiresAt = DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshExpiryDays);
        AuthCookieHelper.SetRefreshTokenCookie(Response, _environment, refreshToken, expiresAt);
    }

    private string? GetIpAddress() => HttpContext.Connection.RemoteIpAddress?.ToString();

    private string? GetUserAgent() => Request.Headers.UserAgent.ToString();
}

public sealed record LoginRequest(string Login, string Password);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public sealed record TelegramLoginRequest(
    long Id,
    string FirstName,
    string? LastName,
    string? Username,
    string? PhotoUrl,
    long AuthDate,
    string Hash);

public sealed record TelegramConfigDto(bool Enabled, string? BotUsername);
