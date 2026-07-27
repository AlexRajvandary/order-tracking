using MediatR;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Identity.Login;

namespace OrderTracking.Application.Identity.GetCurrentUser;

public sealed class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, CurrentUserDto>
{
    private readonly IAdminUserRepository _adminUsers;
    private readonly ICurrentUserService _currentUserService;

    public GetCurrentUserQueryHandler(
        IAdminUserRepository adminUsers,
        ICurrentUserService currentUserService)
    {
        _adminUsers = adminUsers;
        _currentUserService = currentUserService;
    }

    public async Task<CurrentUserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId is not { } userId)
        {
            throw new UnauthorizedAccessException();
        }

        var user = await _adminUsers.GetByIdUntrackedAsync(userId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedAccessException();
        }

        return LoginCommandHandler.MapUser(user);
    }
}
