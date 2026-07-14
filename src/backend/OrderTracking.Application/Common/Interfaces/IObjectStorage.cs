namespace OrderTracking.Application.Common.Interfaces;

public interface IObjectStorage
{
    Task EnsureBucketExistsAsync(CancellationToken cancellationToken = default);

    Task PutAsync(
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default);

    Task<Stream> GetAsync(string objectKey, CancellationToken cancellationToken = default);

    Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default);
}
