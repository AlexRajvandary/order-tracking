using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Common;

namespace OrderTracking.Application.Identity.ChangePassword;

public sealed class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IRefreshTokenService _refreshTokenService;

    public ChangePasswordCommandHandler(
        IAdminUserRepository adminUsers,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IPasswordHasher passwordHasher,
        IRefreshTokenService refreshTokenService)
    {
        _adminUsers = adminUsers;
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
        _passwordHasher = passwordHasher;
        _refreshTokenService = refreshTokenService;
    }

    public async Task Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } userId)
        {
            throw new UnauthorizedAccessException();
        }

        var user = await _adminUsers.GetActiveByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedAccessException();

        if (!_passwordHasher.Verify(user, request.CurrentPassword, user.PasswordHash))
        {
            throw new DomainException("Current password is incorrect");
        }

        user.PasswordHash = _passwordHasher.Hash(user, request.NewPassword);
        await _refreshTokenService.RevokeAllForUserAsync(userId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
