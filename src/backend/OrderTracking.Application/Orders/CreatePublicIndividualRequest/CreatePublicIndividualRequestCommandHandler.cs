using MediatR;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.CreatePublicIndividualRequest;

public sealed class CreatePublicIndividualRequestCommandHandler
    : IRequestHandler<CreatePublicIndividualRequestCommand, OrderDetailsDto>
{
    private readonly IAdminUserRepository _adminUserRepository;

    private readonly IConfiguration _configuration;

    private readonly IMediator _mediator;

    public CreatePublicIndividualRequestCommandHandler(
        IAdminUserRepository adminUserRepository,
        IConfiguration configuration,
        IMediator mediator)
    {
        _adminUserRepository = adminUserRepository;
        _configuration = configuration;
        _mediator = mediator;
    }

    public async Task<OrderDetailsDto> Handle(
        CreatePublicIndividualRequestCommand request,
        CancellationToken cancellationToken)
    {
        var creator = await ResolveCreatorAsync(cancellationToken);
        var contactType = request.ContactType.Trim().ToLowerInvariant();
        var contact = request.Contact.Trim();

        var customer = new CreateOrderNewCustomerDto(
            null,
            request.CustomerName.Trim(),
            null,
            contactType == "telegram" ? contact : null,
            contactType == "phone" ? contact : null,
            contactType == "whatsapp" ? contact : null,
            contactType == "vk" ? contact : null,
            null);

        var item = new CreateOrderItemDto(
            OrderItemType.Product,
            "Индивидуальный запрос",
            request.Description.Trim(),
            1,
            null,
            null,
            Normalize(request.ProductUrl));

        return await _mediator.Send(
            new CreateOrderCommand(
                null,
                customer,
                "Заявка из формы индивидуального запроса",
                null,
                null,
                [item],
                creator.Id),
            cancellationToken);
    }

    private async Task<AdminUser> ResolveCreatorAsync(CancellationToken cancellationToken)
    {
        var login = _configuration["PublicCheckout:CreatedByAdminLogin"]
            ?? _configuration["Seed:AdminLogin"]
            ?? "admin";

        var creator = await _adminUserRepository.GetByLoginAsync(login, cancellationToken);

        if (creator is null || !creator.IsActive)
        {
            throw new InvalidOperationException(
                $"Active public checkout admin '{login}' was not found");
        }

        return creator;
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
