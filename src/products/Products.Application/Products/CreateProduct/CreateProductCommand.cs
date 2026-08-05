using FluentValidation;
using MediatR;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;
using Products.Domain.Entities;
using Products.Domain.Enums;

namespace Products.Application.Products.CreateProduct;

public sealed record CreateProductCommand(
    string Name,
    string? Slug,
    string? Description,
    string? Sku,
    string? Brand,
    decimal Price,
    string? CurrencyCode,
    decimal? OriginalPrice,
    string? OriginalCurrencyCode,
    string ImageUrl,
    string? SourceUrl,
    bool IsActive = true) : IRequest<ProductDto>;

public sealed class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Slug).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Slug));
        RuleFor(x => x.Sku).MaximumLength(100).When(x => !string.IsNullOrWhiteSpace(x.Sku));
        RuleFor(x => x.Brand).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Brand));
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CurrencyCode).Length(3).When(x => !string.IsNullOrWhiteSpace(x.CurrencyCode));
        RuleFor(x => x.OriginalPrice).GreaterThanOrEqualTo(0).When(x => x.OriginalPrice.HasValue);
        RuleFor(x => x.OriginalCurrencyCode).Length(3)
            .When(x => !string.IsNullOrWhiteSpace(x.OriginalCurrencyCode));
        RuleFor(x => x.OriginalCurrencyCode)
            .NotEmpty()
            .When(x => x.OriginalPrice.HasValue)
            .WithMessage("OriginalCurrencyCode is required when OriginalPrice is set.");
        RuleFor(x => x.ImageUrl).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.SourceUrl).MaximumLength(2000).When(x => !string.IsNullOrWhiteSpace(x.SourceUrl));
    }
}

public sealed class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, ProductDto>
{
    private readonly IProductRepository _products;
    private readonly IProductAuditWriter _audit;
    private readonly IUnitOfWork _uow;

    public CreateProductCommandHandler(
        IProductRepository products,
        IProductAuditWriter audit,
        IUnitOfWork uow)
    {
        _products = products;
        _audit = audit;
        _uow = uow;
    }

    public async Task<ProductDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? ProductMappings.Slugify(request.Name)
            : ProductMappings.Slugify(request.Slug);

        if (await _products.IsSlugTakenAsync(slug, null, cancellationToken))
        {
            slug = $"{slug}-{Guid.NewGuid().ToString("N")[..6]}";
        }

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = slug,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Sku = string.IsNullOrWhiteSpace(request.Sku) ? null : request.Sku.Trim(),
            Brand = string.IsNullOrWhiteSpace(request.Brand) ? null : request.Brand.Trim(),
            Price = request.Price,
            CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode)
                ? "RUB"
                : request.CurrencyCode.Trim().ToUpperInvariant(),
            OriginalPrice = request.OriginalPrice,
            OriginalCurrencyCode = string.IsNullOrWhiteSpace(request.OriginalCurrencyCode)
                ? null
                : request.OriginalCurrencyCode.Trim().ToUpperInvariant(),
            ImageUrl = request.ImageUrl.Trim(),
            SourceUrl = string.IsNullOrWhiteSpace(request.SourceUrl) ? null : request.SourceUrl.Trim(),
            IsActive = request.IsActive,
        };

        _products.Add(product);
        await _audit.WriteAsync(product.Id, ProductAuditActions.Created, null, product, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return product.ToDto();
    }
}
