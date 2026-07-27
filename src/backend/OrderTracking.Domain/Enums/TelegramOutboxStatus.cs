namespace OrderTracking.Domain.Enums;

public enum TelegramOutboxStatus : short
{
    Pending = 0,
    Processing = 1,
    Sent = 2,
    Failed = 3,
    Dead = 4,
}
