namespace OrderTracking.Application.Orders.AiParse;

/// <summary>
/// Structured draft produced by AI for autofilling CreateOrder form.
/// Aligned with CreateOrderCommand / CreateOrder*Dto — does not create an order.
/// </summary>
public sealed record AiOrderDraft(
    AiOrderCustomerDraft? Customer,
    IReadOnlyList<AiOrderItemDraft> Items,
    AiOrderDeliveryDraft? Delivery,
    AiOrderPaymentDraft? Payment,
    string? Comment,
    IReadOnlyList<string> MissingFields,
    IReadOnlyList<AiUncertainField> UncertainFields);

public sealed record AiOrderCustomerDraft(
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? Telegram,
    string? Phone,
    string? Email);

public sealed record AiOrderItemDraft(
    string? ItemType,
    string? Name,
    string? Url,
    string? Description,
    int? Quantity,
    decimal? UnitPrice,
    string? CurrencyCode);

public sealed record AiOrderDeliveryDraft(
    string? City,
    string? Street,
    string? Building,
    string? Apartment,
    string? PostalCode,
    string? Note);

/// <summary>
/// Prepayment is not a CreateOrder field — surfaced for adminNotes / review.
/// </summary>
public sealed record AiOrderPaymentDraft(
    decimal? Prepayment,
    string? CurrencyCode);

public sealed record AiUncertainField(
    string Field,
    string Reason);
