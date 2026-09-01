using Xunit;

namespace ProductTranslationJobsWorker.Tests;

public sealed class TranslationValidationTests
{
    private static readonly Guid FirstId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    private static readonly Guid SecondId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    [Fact]
    public void AcceptsExactlyOneTranslationPerRequestedId()
    {
        var requested = Sources();
        var result = TranslationValidation.Validate(requested, [
            new ProductTranslationItem { Id = FirstId.ToString(), Translation = "Первый" },
            new ProductTranslationItem { Id = SecondId.ToString(), Translation = "Второй" },
        ]);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void RejectsMissingId()
    {
        Assert.Throws<InvalidDataException>(() => TranslationValidation.Validate(
            Sources(),
            [new ProductTranslationItem { Id = FirstId.ToString(), Translation = "Первый" }]));
    }

    [Fact]
    public void RejectsDuplicateId()
    {
        Assert.Throws<InvalidDataException>(() => TranslationValidation.Validate(
            Sources(),
            [
                new ProductTranslationItem { Id = FirstId.ToString(), Translation = "Первый" },
                new ProductTranslationItem { Id = FirstId.ToString(), Translation = "Дубликат" },
            ]));
    }

    [Fact]
    public void RejectsUnknownId()
    {
        Assert.Throws<InvalidDataException>(() => TranslationValidation.Validate(
            Sources(),
            [
                new ProductTranslationItem { Id = FirstId.ToString(), Translation = "Первый" },
                new ProductTranslationItem { Id = Guid.NewGuid().ToString(), Translation = "Неизвестный" },
            ]));
    }

    [Fact]
    public void RejectsEmptyTranslation()
    {
        Assert.Throws<InvalidDataException>(() => TranslationValidation.Validate(
            Sources(),
            [
                new ProductTranslationItem { Id = FirstId.ToString(), Translation = " " },
                new ProductTranslationItem { Id = SecondId.ToString(), Translation = "Второй" },
            ]));
    }

    [Fact]
    public void RejectsEmptyArrayForNonEmptyBatch()
    {
        Assert.Throws<InvalidDataException>(() => TranslationValidation.Validate(
            Sources(),
            []));
    }

    [Fact]
    public void SelectsOnlyUnambiguousKnownTranslationsFromPartialResponse()
    {
        var partial = TranslationValidation.SelectUnambiguousValid(Sources(), [
            new ProductTranslationItem { Id = FirstId.ToString(), Translation = "Первый" },
            new ProductTranslationItem { Id = FirstId.ToString(), Translation = "Дубликат" },
            new ProductTranslationItem { Id = SecondId.ToString(), Translation = "Второй" },
            new ProductTranslationItem { Id = Guid.NewGuid().ToString(), Translation = "Неизвестный" },
        ]);

        var item = Assert.Single(partial);
        Assert.Equal(SecondId, item.Id);
    }

    private static IReadOnlyList<TranslationSourceDto> Sources()
    {
        return [
            new TranslationSourceDto(FirstId, "Первое"),
            new TranslationSourceDto(SecondId, "Второе"),
        ];
    }
}
