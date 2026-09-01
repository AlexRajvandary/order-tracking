namespace ProductTranslationWorker;

public interface ITranslationProvider
{
    string Name { get; }
    string Model { get; }
    Task<IReadOnlyList<ProductTranslationResultDto>> TranslateAsync(
        IReadOnlyList<PendingProductDto> products,
        CancellationToken cancellationToken);
}
