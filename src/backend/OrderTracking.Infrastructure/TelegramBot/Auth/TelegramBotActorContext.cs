using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.TelegramBot.Auth;

internal sealed class TelegramBotActorContext : ITelegramBotActorContext
{
    public Guid? AdminId { get; set; }
    public string? Login { get; set; }
    public AdminRole? Role { get; set; }
}
