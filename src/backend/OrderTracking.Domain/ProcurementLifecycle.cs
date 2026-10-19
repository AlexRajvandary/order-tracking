using OrderTracking.Domain.Enums;

namespace OrderTracking.Domain;

public static class ProcurementLifecycle
{
    private static readonly string[] StageSequence = ["purchase", "originWarehouse", "transit", "moscow", "customerDelivery", "archive"];
    private static readonly IReadOnlyDictionary<string, ProcurementLifecycleStatus[]> StageStatuses =
        new Dictionary<string, ProcurementLifecycleStatus[]>
        {
            ["purchase"] = [ProcurementLifecycleStatus.RequiredPurchase, ProcurementLifecycleStatus.Purchased],
            ["originWarehouse"] = [ProcurementLifecycleStatus.AwaitingWarehouse, ProcurementLifecycleStatus.AtOriginWarehouse],
            ["transit"] = [ProcurementLifecycleStatus.AwaitingTransitShipment, ProcurementLifecycleStatus.SentToTransit, ProcurementLifecycleStatus.ArrivedTransitCountry],
            ["moscow"] = [ProcurementLifecycleStatus.AwaitingMoscowShipment, ProcurementLifecycleStatus.SentToMoscow, ProcurementLifecycleStatus.ArrivedMoscow],
            ["customerDelivery"] = [ProcurementLifecycleStatus.AwaitingCustomerShipment, ProcurementLifecycleStatus.HandedToDelivery],
        };

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
        Next(current) == next || Previous(current) == next || NextAction(current) == next;

    public static ProcurementLifecycleStatus? NextAction(ProcurementLifecycleStatus status) => status switch
    {
        ProcurementLifecycleStatus.RequiredPurchase => ProcurementLifecycleStatus.Purchased,
        ProcurementLifecycleStatus.Purchased or ProcurementLifecycleStatus.AwaitingWarehouse => ProcurementLifecycleStatus.AtOriginWarehouse,
        ProcurementLifecycleStatus.AtOriginWarehouse or ProcurementLifecycleStatus.AwaitingTransitShipment => ProcurementLifecycleStatus.SentToTransit,
        ProcurementLifecycleStatus.SentToTransit => ProcurementLifecycleStatus.ArrivedTransitCountry,
        ProcurementLifecycleStatus.ArrivedTransitCountry or ProcurementLifecycleStatus.AwaitingMoscowShipment => ProcurementLifecycleStatus.SentToMoscow,
        ProcurementLifecycleStatus.SentToMoscow => ProcurementLifecycleStatus.ArrivedMoscow,
        ProcurementLifecycleStatus.ArrivedMoscow or ProcurementLifecycleStatus.AwaitingCustomerShipment => ProcurementLifecycleStatus.HandedToDelivery,
        ProcurementLifecycleStatus.HandedToDelivery => ProcurementLifecycleStatus.Delivered,
        _ => null,
    };

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
        if (!StageStatuses.TryGetValue(targetStage, out var targetStatuses)) return null;

        var currentStageIndex = Array.IndexOf(StageSequence, Stage(current));
        var targetStageIndex = Array.IndexOf(StageSequence, targetStage);
        if (currentStageIndex < 0 || targetStageIndex < 0 || currentStageIndex == targetStageIndex) return null;

        // Moving forward enters the target stage; moving backward returns the item
        // to the last state it had reached within that stage.
        return targetStageIndex > currentStageIndex ? targetStatuses[0] : targetStatuses[^1];
    }

}
