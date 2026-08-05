using Products.Application.Common.Interfaces;
using Products.Infrastructure.Persistence;

namespace Products.Infrastructure.Persistence;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly ProductsDbContext _db;

    public UnitOfWork(ProductsDbContext db) => _db = db;

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _db.SaveChangesAsync(cancellationToken);
}

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
