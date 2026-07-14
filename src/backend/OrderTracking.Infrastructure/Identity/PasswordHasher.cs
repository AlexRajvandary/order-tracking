using Microsoft.AspNetCore.Identity;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Infrastructure.Identity;

public sealed class PasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<AdminUser> _hasher = new();

    public string Hash(AdminUser user, string password) => _hasher.HashPassword(user, password);

    public bool Verify(AdminUser user, string password, string passwordHash) =>
        _hasher.VerifyHashedPassword(user, passwordHash, password) != PasswordVerificationResult.Failed;
}
