using FluentValidation;
using MediatR;
using Products.Application.Common.Exceptions;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;
using Products.Domain.Enums;

namespace Products.Application.Products.UpdateProduct;

public sealed record UpdateProductCommand(
    Guid Id,
    string Name,
    string? Slug,
    string? Description,
    string? Sku,
    string? Brand,
    Guid? BrandId,
    decimal Price,
    string? CurrencyCode,
    decimal? OriginalPrice,
    string? OriginalCurrencyCode,
    string ImageUrl,
    string? SourceUrl,
    bool IsActive,
    string? Condition = null,
    Guid? ShopId = null) : IRequest<ProductDto>;

public sealed class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
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

public sealed class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, ProductDto>
{
    private readonly IProductRepository _products;
    private readonly IProductAuditWriter _audit;
    private readonly IUnitOfWork _uow;

    public UpdateProductCommandHandler(
        IProductRepository products,
        IProductAuditWriter audit,
        IUnitOfWork uow)
    {
        _products = products;
        _audit = audit;
        _uow = uow;
    }

    public async Task<ProductDto> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _products.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException($"Product {request.Id} was not found.");

        var oldSnapshot = Clone(product);

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? ProductMappings.Slugify(request.Name)
            : ProductMappings.Slugify(request.Slug);

        if (await _products.IsSlugTakenAsync(slug, product.Id, cancellationToken))
        {
            throw new ValidationException("Slug is already taken.");
        }

        product.Name = request.Name.Trim();
        product.Slug = slug;
        product.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        product.Sku = string.IsNullOrWhiteSpace(request.Sku) ? null : request.Sku.Trim();
        product.Brand = string.IsNullOrWhiteSpace(request.Brand) ? null : request.Brand.Trim();
        product.BrandId = request.BrandId;
        product.Price = request.Price;
        product.CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode)
            ? product.CurrencyCode
            : request.CurrencyCode.Trim().ToUpperInvariant();
        product.OriginalPrice = request.OriginalPrice;
        product.OriginalCurrencyCode = string.IsNullOrWhiteSpace(request.OriginalCurrencyCode)
            ? null
            : request.OriginalCurrencyCode.Trim().ToUpperInvariant();
        product.ImageUrl = request.ImageUrl.Trim();
        product.SourceUrl = string.IsNullOrWhiteSpace(request.SourceUrl) ? null : request.SourceUrl.Trim();
        product.IsActive = request.IsActive;
        if (!string.IsNullOrWhiteSpace(request.Condition)
            && ListProducts.ListProductsQueryHandler.TryParseCondition(request.Condition, out var condition))
        {
            product.Condition = condition;
        }
        product.ShopId = request.ShopId;

        await _audit.WriteAsync(product.Id, ProductAuditActions.Updated, oldSnapshot, product, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        return product.ToDto();
    }

    private static Domain.Entities.Product Clone(Domain.Entities.Product source) =>
        new()
        {
            Id = source.Id,
            Name = source.Name,
            Slug = source.Slug,
            Description = source.Description,
            Sku = source.Sku,
            Brand = source.Brand,
            BrandId = source.BrandId,
            ShopId = source.ShopId,
            Condition = source.Condition,
            Price = source.Price,
            CurrencyCode = source.CurrencyCode,
            OriginalPrice = source.OriginalPrice,
            OriginalCurrencyCode = source.OriginalCurrencyCode,
            ImageUrl = source.ImageUrl,
            SourceUrl = source.SourceUrl,
            IsActive = source.IsActive,
            CreatedAt = source.CreatedAt,
            UpdatedAt = source.UpdatedAt,
            IsDeleted = source.IsDeleted,
            DeletedAt = source.DeletedAt,
        };
}
