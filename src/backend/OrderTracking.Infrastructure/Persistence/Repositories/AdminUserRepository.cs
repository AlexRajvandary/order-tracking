using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Persistence.Repositories;

public sealed class AdminUserRepository : IAdminUserRepository
{
    private readonly ApplicationDbContext _db;

    public AdminUserRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public void Add(AdminUser user) => _db.AdminUsers.Add(user);

    public Task<AdminUser?> GetByLoginAsync(string login, CancellationToken cancellationToken = default) =>
        _db.AdminUsers.FirstOrDefaultAsync(u => u.Login == login, cancellationToken);

    public Task<AdminUser?> GetByIdTrackedAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.AdminUsers.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<AdminUser?> GetByIdUntrackedAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.AdminUsers.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<AdminUser?> GetActiveByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.AdminUsers.FirstOrDefaultAsync(u => u.Id == id && u.IsActive, cancellationToken);

    public Task<AdminUser?> GetByTelegramIdAsync(long telegramId, CancellationToken cancellationToken = default) =>
        _db.AdminUsers.FirstOrDefaultAsync(u => u.TelegramId == telegramId, cancellationToken);

    public Task<AdminUser?> GetActiveByTelegramIdAsync(long telegramId, CancellationToken cancellationToken = default) =>
        _db.AdminUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.TelegramId == telegramId && u.IsActive, cancellationToken);

    public async Task<IReadOnlyList<AdminUser>> ListOrderedByLoginAsync(CancellationToken cancellationToken = default) =>
        await _db.AdminUsers
            .AsNoTracking()
            .OrderBy(u => u.Login)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AdminUser>> ListActiveWithTelegramAsync(
        CancellationToken cancellationToken = default) =>
        await _db.AdminUsers
            .AsNoTracking()
            .Where(u => u.IsActive && u.TelegramId != null)
            .OrderBy(u => u.Login)
            .ToListAsync(cancellationToken);

    public Task<bool> ExistsByLoginAsync(string login, CancellationToken cancellationToken = default) =>
        _db.AdminUsers.AnyAsync(u => u.Login == login, cancellationToken);

    public Task<bool> IsTelegramIdTakenAsync(
        long telegramId,
        Guid excludeAdminId,
        CancellationToken cancellationToken = default) =>
        _db.AdminUsers.AnyAsync(
            u => u.TelegramId == telegramId && u.Id != excludeAdminId,
            cancellationToken);
}
