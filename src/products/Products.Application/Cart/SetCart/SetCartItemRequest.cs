using MediatR;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Application.Cart.SetCart
{
    public sealed record SetCartItemCommand(Guid ProductId, int Quantity, string? SelectedColor = null, string? SelectedSize = null) : IRequest<SetCartItemResult>;

    public abstract record SetCartItemResult
    {
        public sealed record Updated(CartItemDto Item) : SetCartItemResult;
        public sealed record Deleted : SetCartItemResult;
        public sealed record ProductNotFound : SetCartItemResult;
        public sealed record InvalidOption(string Message) : SetCartItemResult;
        public sealed record OwnerRequired : SetCartItemResult;
    }

    public sealed class SetCartItemCommandHandler(
     ICartRepository cartRepository,
     ICatalogProductRepository productRepository,
     ICatalogOwnerProvider ownerProvider,
     IUnitOfWork unitOfWork,
     IDateTimeProvider dateTimeProvider)
     : IRequestHandler<SetCartItemCommand, SetCartItemResult>
    {
        public async Task<SetCartItemResult> Handle(
            SetCartItemCommand command,
            CancellationToken ct)
        {
            var owner = ownerProvider.GetCurrentOwner();

            if (owner is null)
                return new SetCartItemResult.OwnerRequired();

            var color = command.SelectedColor?.Trim() ?? string.Empty;
            var size = command.SelectedSize?.Trim() ?? string.Empty;

            if (color.Length > 200 || size.Length > 100)
                return new SetCartItemResult.InvalidOption("Выбранный параметр товара слишком длинный.");

            // FindAsync ищет по владельцу, товару, цвету и размеру.
            var item = await cartRepository.FindAsync(
                owner.Value,
                command.ProductId,
                color,
                size,
                ct);

            // Удаление обрабатываем до проверки активности товара.
            if (command.Quantity <= 0)
            {
                if (item is not null)
                    await unitOfWork.ExecuteInTransactionAsync(_ =>
                    {
                        cartRepository.Remove(item);
                        return Task.CompletedTask;
                    }, ct);

                return new SetCartItemResult.Deleted();
            }

            var product = await productRepository.GetActiveForCartAsync(
                command.ProductId, ct);

            if (product is null)
                return new SetCartItemResult.ProductNotFound();

            if (color.Length > 0 &&
                !await productRepository.HasColorAsync(
                    command.ProductId, color, ct))
            {
                return new SetCartItemResult.InvalidOption(
                    "Выбранный цвет недоступен для товара.");
            }

            if (size.Length > 0 &&
                !await productRepository.HasSizeAsync(
                    command.ProductId, size, ct))
            {
                return new SetCartItemResult.InvalidOption(
                    "Выбранный размер недоступен для товара.");
            }

            await unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                item = await cartRepository.FindAsync(owner.Value, command.ProductId, color, size, token);
                if (item is null)
                {
                    item = new CatalogCartItem
                    {
                        Id = Guid.NewGuid(),
                        ProductId = command.ProductId,
                        UserId = owner.Value.UserId,
                        VisitorKey = owner.Value.VisitorKey,
                        SelectedColor = color,
                        SelectedSize = size
                    };

                    cartRepository.Add(item);
                }

                item.Quantity = Math.Min(command.Quantity, 999);
                item.UpdatedAt = dateTimeProvider.UtcNow;
            }, ct);

            var savedItem = item ?? throw new InvalidOperationException("The cart item was not saved.");
            var dto = new CartItemDto(
                "Internal",
                product.Id.ToString(),
                product.Id,
                null,
                product.Slug,
                product.Name,
                product.Price,
                product.CurrencyCode,
                product.LocalImageUrl ?? product.ImageUrl,
                product.SourceUrl,
                null,
                product.Shop?.Name,
                true,
                savedItem.Quantity,
                savedItem.UpdatedAt,
                EmptyToNull(savedItem.SelectedColor),
                EmptyToNull(savedItem.SelectedSize));

            return new SetCartItemResult.Updated(dto);
        }

        private static string? EmptyToNull(string value) => value.Length == 0 ? null : value;
    }
}
