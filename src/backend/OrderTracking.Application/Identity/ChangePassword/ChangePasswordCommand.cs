using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Identity.ChangePassword;

public sealed record ChangePasswordCommand(
    string CurrentPassword,
    string NewPassword) : IRequest, IAuditableCommand;
