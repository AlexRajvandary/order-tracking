using FluentValidation;
using MediatR;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Admins.UpdateAdmin;

public sealed record UpdateAdminCommand(
    Guid Id,
    string? DisplayName,
    bool IsActive,
    AdminRole? Role) : IRequest<AdminUserDto>;

public sealed class UpdateAdminCommandValidator : AbstractValidator<UpdateAdminCommand>
{
    public UpdateAdminCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.DisplayName).MaximumLength(200);
        RuleFor(x => x.Role)
            .IsInEnum()
            .When(x => x.Role.HasValue);
    }
}
