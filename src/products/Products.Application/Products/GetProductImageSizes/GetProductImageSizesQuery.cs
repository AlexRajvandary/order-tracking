using MediatR;
using Products.Application.Common.Interfaces;

namespace Products.Application.Products.GetProductImageSizes;

public sealed record GetProductImageSizesQuery(IReadOnlyCollection<Guid> ProductIds)
    : IRequest<IReadOnlyDictionary<Guid, long?>>;

public sealed class GetProductImageSizesQueryHandler
    : IRequestHandler<GetProductImageSizesQuery, IReadOnlyDictionary<Guid, long?>>
{
    private const int MaxProducts = 100;
    private readonly IProductRepository _products;
    private readonly IProductImageSizeReader _imageSizes;

    public GetProductImageSizesQueryHandler(
        IProductRepository products,
        IProductImageSizeReader imageSizes)
    {
        _products = products;
        _imageSizes = imageSizes;
    }

    public async Task<IReadOnlyDictionary<Guid, long?>> Handle(
        GetProductImageSizesQuery request,
        CancellationToken cancellationToken)
    {
        var ids = request.ProductIds.Distinct().Take(MaxProducts).ToArray();
        var products = new List<(Guid Id, string ImageUrl)>(ids.Length);
        foreach (var id in ids)
        {
            var product = await _products.GetByIdAsync(id, cancellationToken);
            if (product is not null)
            {
                products.Add((id, product.ImageUrl));
            }
        }

        var result = ids.ToDictionary(id => id, _ => (long?)null);

        await Parallel.ForEachAsync(
            products,
            new ParallelOptions { MaxDegreeOfParallelism = 8, CancellationToken = cancellationToken },
            async (product, token) =>
            {
                var size = await _imageSizes.GetSizeAsync(product.ImageUrl, token);

                lock (result)
                {
                    result[product.Id] = size;
                }
            });

        return result;
    }
}
