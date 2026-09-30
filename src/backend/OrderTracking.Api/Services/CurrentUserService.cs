using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Api.Services;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ITelegramBotActorContext _telegramActor;

    public CurrentUserService(
        IHttpContextAccessor httpContextAccessor,
        ITelegramBotActorContext telegramActor)
    {
        _httpContextAccessor = httpContextAccessor;
        _telegramActor = telegramActor;
    }

    public Guid? UserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user is null)
            {
                return _telegramActor.AdminId;
            }

            var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("sub");

            return Guid.TryParse(value, out var id) ? id : _telegramActor.AdminId;
        }
    }

    public string? Login =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue("unique_name") ?? _telegramActor.Login;

    public AdminRole? Role
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<AdminRole>(value, ignoreCase: true, out var role) ? role : _telegramActor.Role;
        }
    }

    public bool IsAuthenticated =>
        (_httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false) || _telegramActor.AdminId.HasValue;
}
