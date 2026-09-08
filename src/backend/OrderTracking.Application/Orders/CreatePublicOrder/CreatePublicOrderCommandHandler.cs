using MediatR;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Orders.CreateOrder;
using OrderTracking.Application.Orders.Models;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Application.Orders.CreatePublicOrder;

public sealed class CreatePublicOrderCommandHandler
    : IRequestHandler<CreatePublicOrderCommand, OrderDetailsDto>
{
    private readonly IProductCatalogClient _productCatalogClient;

    private readonly IAdminUserRepository _adminUserRepository;

    private readonly IConfiguration _configuration;

    private readonly IMediator _mediator;

    public CreatePublicOrderCommandHandler(
        IProductCatalogClient productCatalogClient,
        IAdminUserRepository adminUserRepository,
        IConfiguration configuration,
        IMediator mediator)
    {
        _productCatalogClient = productCatalogClient;
        _adminUserRepository = adminUserRepository;
        _configuration = configuration;
        _mediator = mediator;
    }

    public async Task<OrderDetailsDto> Handle(
        CreatePublicOrderCommand request,
        CancellationToken cancellationToken)
    {
        var creator = await ResolveCreatorAsync(cancellationToken);
        var resolution = await _productCatalogClient.ResolveCheckoutAsync(request.Items.Select(x =>
            new CatalogProductReference(x.Source, x.ProductId, x.ExternalId, x.ExpectedUnitPrice, x.ExpectedCurrencyCode)).ToList(), cancellationToken);
        if (resolution.Issues.Count > 0) throw new CatalogCheckoutException(resolution.Issues);
        if (resolution.Items.Count != request.Items.Count) throw new CatalogCheckoutException(
            [new("Unknown", "", "invalid_response", null, null, null)]);

        var items = request.Items.Zip(resolution.Items).Select(pair =>
        {
            var requestItem = pair.First;
            var product = pair.Second;
            return new CreateOrderItemDto(OrderItemType.Product, product.Name, product.Description,
                requestItem.Quantity, product.Price, product.CurrencyCode, product.SourceUrl,
                product.Source, product.ProductId, product.ExternalId, product.ImageUrl,
                product.AffiliateUrl, product.ShopCode, product.ShopName);
        }).ToList();

        var customer = new CreateOrderNewCustomerDto(
            null,
            Normalize(request.Name),
            null,
            Normalize(request.Telegram),
            Normalize(request.Phone),
            Normalize(request.WhatsApp),
            Normalize(request.Vk),
            null);

        var address = string.IsNullOrWhiteSpace(request.Address)
            ? null
            : new CreateOrderDeliveryAddressDto(null, null, null, null, null, request.Address.Trim());

        return await _mediator.Send(
            new CreateOrderCommand(
                null,
                customer,
                null,
                null,
                address,
                items,
                creator.Id),
            cancellationToken);
    }

    private async Task<OrderTracking.Domain.Entities.AdminUser> ResolveCreatorAsync(
        CancellationToken cancellationToken)
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
