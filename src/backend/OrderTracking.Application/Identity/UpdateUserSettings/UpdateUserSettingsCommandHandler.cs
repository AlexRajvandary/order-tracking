using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Identity;

namespace OrderTracking.Application.Identity.UpdateUserSettings;

public sealed class UpdateUserSettingsCommandHandler : IRequestHandler<UpdateUserSettingsCommand>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public UpdateUserSettingsCommandHandler(
        IAdminUserRepository adminUsers,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _adminUsers = adminUsers;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateUserSettingsCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } userId)
        {
            throw new UnauthorizedAccessException();
        }

        var user = await _adminUsers.GetActiveByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedAccessException();

        user.SettingsJson = UserSettingsHelper.Serialize(request.Settings);
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
