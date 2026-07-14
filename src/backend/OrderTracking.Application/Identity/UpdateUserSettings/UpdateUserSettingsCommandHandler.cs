using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Identity;

namespace OrderTracking.Application.Identity.UpdateUserSettings;

public sealed class UpdateUserSettingsCommandHandler : IRequestHandler<UpdateUserSettingsCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateUserSettingsCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateUserSettingsCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } userId)
        {
            throw new UnauthorizedAccessException();
        }

        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, cancellationToken)
            ?? throw new UnauthorizedAccessException();

        user.SettingsJson = UserSettingsHelper.Serialize(request.Settings);
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
