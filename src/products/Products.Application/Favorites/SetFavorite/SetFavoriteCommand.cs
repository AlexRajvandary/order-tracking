using MediatR;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Application.Favorites.SetFavorite;

public sealed record SetFavoriteCommand(Guid ProductId, bool Favorite) : IRequest<SetFavoriteResult>;

public abstract record SetFavoriteResult
{
    public sealed record Updated : SetFavoriteResult;
    public sealed record ProductNotFound : SetFavoriteResult;
    public sealed record OwnerRequired : SetFavoriteResult;
}

public sealed class SetFavoriteCommandHandler(
    IFavoriteRepository favoriteRepository,
    ICatalogProductRepository productRepository,
    ICatalogOwnerProvider ownerProvider,
    IUnitOfWork unitOfWork,
    IDateTimeProvider dateTimeProvider) : IRequestHandler<SetFavoriteCommand, SetFavoriteResult>
{
    public async Task<SetFavoriteResult> Handle(SetFavoriteCommand request, CancellationToken cancellationToken)
    {
        var owner = ownerProvider.GetCurrentOwner();
        if (owner is null)
            return new SetFavoriteResult.OwnerRequired();

        if (request.Favorite && await productRepository.GetActiveForCartAsync(request.ProductId, cancellationToken) is null)
            return new SetFavoriteResult.ProductNotFound();

        await unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var row = await favoriteRepository.FindAsync(owner.Value, request.ProductId, token);
            if (request.Favorite && row is null)
            {
                favoriteRepository.Add(new CatalogFavorite
                {
                    Id = Guid.NewGuid(),
                    ProductId = request.ProductId,
                    UserId = owner.Value.UserId,
                    VisitorKey = owner.Value.VisitorKey,
                    CreatedAt = dateTimeProvider.UtcNow,
                });
            }
            else if (!request.Favorite && row is not null)
            {
                favoriteRepository.Remove(row);
            }
        }, cancellationToken);

        return new SetFavoriteResult.Updated();
    }
}
