namespace OrderTracking.Domain.Enums;

public enum PurchaseStatus
{
    Pending = 0,
    Purchased = 1,
    Error = 2,
}

public enum ArrivalStatus
{
    Pending = 0,
    Received = 1,
}

public enum ShipmentStatus
{
    AwaitingShipment = 0,
    Shipped = 1,
}
