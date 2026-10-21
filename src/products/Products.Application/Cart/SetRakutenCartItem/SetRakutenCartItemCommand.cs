using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.ExternalProducts;
using Products.Domain.Entities;

namespace Products.Application.Cart.SetRakutenCartItem;

public sealed record SetRakutenCartItemCommand(string? ExternalId, int Quantity) : IRequest<SetRakutenCartItemResult>;

public abstract record SetRakutenCartItemResult
{
    public sealed record Updated(CartItemDto Item) : SetRakutenCartItemResult;
    public sealed record Deleted : SetRakutenCartItemResult;
    public sealed record NotFound : SetRakutenCartItemResult;
    public sealed record InvalidRequest(string Message) : SetRakutenCartItemResult;
    public sealed record OwnerRequired : SetRakutenCartItemResult;
    public sealed record Unavailable(string Message) : SetRakutenCartItemResult;
    public sealed record ProductUnavailable : SetRakutenCartItemResult;
}

public sealed class SetRakutenCartItemCommandHandler(
    ICartRepository cartRepository,
    ICatalogOwnerProvider ownerProvider,
    IRakutenCatalogClient rakuten,
    IUnitOfWork unitOfWork,
    IDateTimeProvider dateTimeProvider) : IRequestHandler<SetRakutenCartItemCommand, SetRakutenCartItemResult>
{
    public async Task<SetRakutenCartItemResult> Handle(SetRakutenCartItemCommand request, CancellationToken cancellationToken)
    {
        var owner = ownerProvider.GetCurrentOwner();
        if (owner is null)
            return new SetRakutenCartItemResult.OwnerRequired();

        var externalId = request.ExternalId?.Trim();
        if (string.IsNullOrEmpty(externalId))
            return new SetRakutenCartItemResult.InvalidRequest("externalId is required.");

        if (externalId.Length > 255)
            return new SetRakutenCartItemResult.InvalidRequest("externalId must be at most 255 characters.");

        ExternalProductCartItem? row = null;
        if (request.Quantity <= 0)
        {
            await unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                row = await cartRepository.FindExternalAsync(owner.Value, "Rakuten", externalId, token);
                if (row is not null)
                    cartRepository.RemoveExternal(row);
            }, cancellationToken);
            return new SetRakutenCartItemResult.Deleted();
        }

        ExternalCatalogProductDto? product;
        try
        {
            product = await rakuten.GetByItemCodeAsync(externalId, cancellationToken);
        }
        catch (ExternalCatalogUnavailableException exception)
        {
            return new SetRakutenCartItemResult.Unavailable(exception.Message);
        }

        if (product is null)
            return new SetRakutenCartItemResult.NotFound();

        if (!product.Available)
            return new SetRakutenCartItemResult.ProductUnavailable();

        var now = dateTimeProvider.UtcNow;
        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            row = await cartRepository.FindExternalAsync(owner.Value, "Rakuten", externalId, token);
            if (row is null)
            {
                row = new ExternalProductCartItem
                {
                    Id = Guid.NewGuid(),
                    Source = "Rakuten",
                    ExternalId = externalId,
                    UserId = owner.Value.UserId,
                    VisitorKey = owner.Value.VisitorKey,
                    AddedAt = now,
                };
                cartRepository.AddExternal(row);
            }

            row.Name = product.Name;
            row.Description = product.Description;
            row.UnitPrice = product.Price;
            row.CurrencyCode = product.CurrencyCode;
            row.ImageUrl = product.ImageUrl;
            row.SourceUrl = product.SourceUrl;
            row.AffiliateUrl = product.AffiliateUrl;
            row.ShopCode = product.ShopCode;
            row.ShopName = product.ShopName;
            row.Available = product.Available;
            row.Quantity = Math.Min(request.Quantity, 100);
            row.LastValidatedAt = now;
            row.UpdatedAt = now;
        }, cancellationToken);

        return new SetRakutenCartItemResult.Updated(CartItemMappings.ToDto(row!));
    }
}
