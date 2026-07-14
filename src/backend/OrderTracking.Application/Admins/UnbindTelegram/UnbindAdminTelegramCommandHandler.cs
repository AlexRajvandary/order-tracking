using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Admins;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Admins.UnbindTelegram;

public sealed class UnbindAdminTelegramCommandHandler
    : IRequestHandler<UnbindAdminTelegramCommand, AdminUserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeProvider _clock;

    public UnbindAdminTelegramCommandHandler(IApplicationDbContext context, IDateTimeProvider clock)
    {
        _context = context;
        _clock = clock;
    }

    public async Task<AdminUserDto> Handle(
        UnbindAdminTelegramCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.Id == request.AdminId, cancellationToken)
            ?? throw new KeyNotFoundException($"Admin '{request.AdminId}' was not found");

        user.TelegramId = null;
        user.TelegramUsername = null;
        await _context.SaveChangesAsync(cancellationToken);

        return AdminUserMapping.ToDto(user, _clock.UtcNow);
    }
}
