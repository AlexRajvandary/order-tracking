namespace OrderTracking.Domain.Enums;

public enum WarehouseCondition
{
    Ok = 0,
    Damaged = 1,
    WrongItem = 2,
    Incomplete = 3,
    Good = 4,
}

public enum ProcurementAttachmentKind
{
    Receipt = 0,
    WarehousePhoto = 1,
}
