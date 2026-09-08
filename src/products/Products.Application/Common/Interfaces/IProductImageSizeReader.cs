namespace Products.Application.Common.Interfaces;

public interface IProductImageSizeReader
{
    Task<long?> GetSizeAsync(string imageUrl, CancellationToken cancellationToken = default);
}
