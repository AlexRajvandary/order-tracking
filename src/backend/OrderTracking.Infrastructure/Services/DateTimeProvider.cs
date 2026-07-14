using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Services;

public sealed class DateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
