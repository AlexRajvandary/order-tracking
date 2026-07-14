using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Persistence.Seed;

public static class StatusDefinitionSeeder
{
    private static readonly (string Name, string Color, int SortOrder, bool IsFinal)[] DefaultStatuses =
    [
        ("Принят в работу", "#3B82F6", 1, false),
        ("В работе", "#F59E0B", 2, false),
        ("Ожидание", "#EF4444", 3, false),
        ("Готово", "#22C55E", 4, false),
        ("Выдан", "#6B7280", 5, true),
    ];

    public static async Task SeedAsync(
        ApplicationDbContext context,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (await context.StatusDefinitions.AnyAsync(cancellationToken))
        {
            var updated = await context.StatusDefinitions
                .Where(s => s.Name == "Выдан" && !s.IsFinal)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsFinal, true), cancellationToken);

            if (updated > 0)
            {
                logger.LogInformation("Marked {Count} 'Выдан' status definitions as final", updated);
            }
            else
            {
                logger.LogDebug("Status definitions already seeded, skipping");
            }

            return;
        }

        var now = DateTimeOffset.UtcNow;
        var statuses = DefaultStatuses.Select(s => new StatusDefinition
        {
            Id = Guid.NewGuid(),
            Name = s.Name,
            ItemType = null,
            Color = s.Color,
            SortOrder = s.SortOrder,
            IsActive = true,
            IsFinal = s.IsFinal,
            CreatedAt = now,
        }).ToList();

        context.StatusDefinitions.AddRange(statuses);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded {Count} default status definitions", statuses.Count);
    }
}
