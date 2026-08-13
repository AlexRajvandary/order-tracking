using FluentValidation;
using MediatR;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Products.NotifyProductImport;

public sealed record NotifyProductImportCommand(
    Guid ImportId,
    int InsertedCount) : IRequest;

public sealed class NotifyProductImportCommandValidator
    : AbstractValidator<NotifyProductImportCommand>
{
    public NotifyProductImportCommandValidator()
    {
        RuleFor(x => x.ImportId).NotEmpty();
        RuleFor(x => x.InsertedCount).GreaterThan(0).LessThanOrEqualTo(100_000);
    }
}

public sealed class NotifyProductImportCommandHandler
    : IRequestHandler<NotifyProductImportCommand>
{
    private readonly ITelegramAdminNotifier _telegram;

    public NotifyProductImportCommandHandler(ITelegramAdminNotifier telegram) =>
        _telegram = telegram;

    public async Task Handle(
        NotifyProductImportCommand request,
        CancellationToken cancellationToken)
    {
        await _telegram.NotifyProductImportCompletedAsync(
            request.ImportId,
            request.InsertedCount,
            cancellationToken);
    }
}
