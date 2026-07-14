using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Common.Interfaces;

public interface IPasswordHasher
{
    string Hash(AdminUser user, string password);
    bool Verify(AdminUser user, string password, string passwordHash);
}
