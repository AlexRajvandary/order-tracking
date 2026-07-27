namespace OrderTracking.Application.Common.Interfaces;

public sealed record TelegramLoginData(
    long Id,
    string FirstName,
    string? LastName,
    string? Username,
    string? PhotoUrl,
    long AuthDate,
    string Hash);
