using MediatR;

namespace OrderTracking.Application.Identity.Logout;

public sealed record LogoutCommand(string? RefreshToken) : IRequest;
