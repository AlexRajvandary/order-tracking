namespace OrderTracking.Domain.Enums;

public enum ProcurementLifecycleStatus
{
    RequiredPurchase,
    Purchased,
    AwaitingWarehouse,
    AtOriginWarehouse,
    AwaitingTransitShipment,
    SentToTransit,
    ArrivedTransitCountry,
    AwaitingMoscowShipment,
    SentToMoscow,
    ArrivedMoscow,
    AwaitingCustomerShipment,
    HandedToDelivery,
    Delivered,
}
