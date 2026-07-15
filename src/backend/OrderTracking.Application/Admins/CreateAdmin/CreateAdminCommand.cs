using FluentValidation;
using MediatR;
using OrderTracking.Application.Admins.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Admins.CreateAdmin;

public sealed record CreateAdminCommand(
    string Login,
    string Password,
    string? DisplayName,
    AdminRole Role) : IRequest<AdminUserDto>;

public sealed class CreateAdminCommandValidator : AbstractValidator<CreateAdminCommand>
{
    public CreateAdminCommandValidator()
    {
        RuleFor(x => x.Login).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6).MaximumLength(200);
        RuleFor(x => x.DisplayName).MaximumLength(200);
        RuleFor(x => x.Role).IsInEnum();
    }
}
