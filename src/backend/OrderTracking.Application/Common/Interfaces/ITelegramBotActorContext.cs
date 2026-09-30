using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Common.Interfaces;

public interface ITelegramBotActorContext
{
    Guid? AdminId { get; set; }
    string? Login { get; set; }
    AdminRole? Role { get; set; }
}
