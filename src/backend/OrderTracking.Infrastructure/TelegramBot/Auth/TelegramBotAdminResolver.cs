using Microsoft.Extensions.DependencyInjection;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Infrastructure.TelegramBot.Auth;

internal sealed class TelegramBotAdminResolver
{
    private readonly TelegramBotRuntime _runtime;

    public TelegramBotAdminResolver(TelegramBotRuntime runtime)
    {
        _runtime = runtime;
    }

    public async Task<TelegramBotAdminContext?> ResolveAsync(long? telegramId, CancellationToken cancellationToken)
    {
        if (telegramId is null)
        {
            return null;
        }

        using var scope = _runtime.ScopeFactory.CreateScope();
        var admin = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .GetActiveByTelegramIdAsync(telegramId.Value, cancellationToken);

        if (admin is null)
        {
            return null;
        }

        return new TelegramBotAdminContext(
            admin.Id,
            admin.TelegramId!.Value,
            admin.Login,
            admin.DisplayName,
            admin.Role,
            admin.IsActive);
    }
}
