namespace OrderTracking.Domain.Enums;

public enum OrderStatus
{
    AwaitingPayment = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3,
}
