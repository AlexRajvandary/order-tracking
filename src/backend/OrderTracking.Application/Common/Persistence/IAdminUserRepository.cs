using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Persistence;

public interface IAdminUserRepository
{
    void Add(AdminUser user);

    Task<AdminUser?> GetByLoginAsync(string login, CancellationToken cancellationToken = default);

    Task<AdminUser?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<AdminUser?> GetByIdUntrackedAsync(Guid id, CancellationToken cancellationToken = default);

    Task<AdminUser?> GetActiveByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<AdminUser?> GetByTelegramIdAsync(long telegramId, CancellationToken cancellationToken = default);

    Task<AdminUser?> GetActiveByTelegramIdAsync(long telegramId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminUser>> ListOrderedByLoginAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AdminUser>> ListActiveWithTelegramAsync(CancellationToken cancellationToken = default);

    Task<bool> ExistsByLoginAsync(string login, CancellationToken cancellationToken = default);

    Task<bool> IsTelegramIdTakenAsync(
        long telegramId,
        Guid excludeAdminId,
        CancellationToken cancellationToken = default);
}
