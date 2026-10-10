using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain;

public static class ProcurementLifecycle
{
    private static readonly ProcurementLifecycleStatus[] Sequence =
    [
        ProcurementLifecycleStatus.RequiredPurchase,
        ProcurementLifecycleStatus.Purchased,
        ProcurementLifecycleStatus.AwaitingWarehouse,
        ProcurementLifecycleStatus.AtOriginWarehouse,
        ProcurementLifecycleStatus.AwaitingTransitShipment,
        ProcurementLifecycleStatus.SentToTransit,
        ProcurementLifecycleStatus.ArrivedTransitCountry,
        ProcurementLifecycleStatus.AwaitingMoscowShipment,
        ProcurementLifecycleStatus.SentToMoscow,
        ProcurementLifecycleStatus.ArrivedMoscow,
        ProcurementLifecycleStatus.AwaitingCustomerShipment,
        ProcurementLifecycleStatus.HandedToDelivery,
        ProcurementLifecycleStatus.Delivered,
    ];

    public static ProcurementLifecycleStatus? Next(ProcurementLifecycleStatus status)
    {
        var index = Array.IndexOf(Sequence, status);
        return index >= 0 && index < Sequence.Length - 1 ? Sequence[index + 1] : null;
    }

    public static ProcurementLifecycleStatus? Previous(ProcurementLifecycleStatus status)
    {
        var index = Array.IndexOf(Sequence, status);
        return index > 0 ? Sequence[index - 1] : null;
    }

    public static bool CanTransition(ProcurementLifecycleStatus current, ProcurementLifecycleStatus next) =>
        Next(current) == next || Previous(current) == next;

    public static string Stage(ProcurementLifecycleStatus status) => status switch
    {
        ProcurementLifecycleStatus.RequiredPurchase or ProcurementLifecycleStatus.Purchased => "purchase",
        ProcurementLifecycleStatus.AwaitingWarehouse or ProcurementLifecycleStatus.AtOriginWarehouse => "originWarehouse",
        ProcurementLifecycleStatus.AwaitingTransitShipment or ProcurementLifecycleStatus.SentToTransit or ProcurementLifecycleStatus.ArrivedTransitCountry => "transit",
        ProcurementLifecycleStatus.AwaitingMoscowShipment or ProcurementLifecycleStatus.SentToMoscow or ProcurementLifecycleStatus.ArrivedMoscow => "moscow",
        ProcurementLifecycleStatus.AwaitingCustomerShipment or ProcurementLifecycleStatus.HandedToDelivery => "customerDelivery",
        ProcurementLifecycleStatus.Delivered => "archive",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    public static ProcurementLifecycleStatus? TargetForStage(ProcurementLifecycleStatus current, string targetStage)
    {
        var next = Next(current);
        if (next is not null && Stage(next.Value) == targetStage) return next;
        var previous = Previous(current);
        if (previous is not null && Stage(previous.Value) == targetStage) return previous;
        return null;
    }

}
