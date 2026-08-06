using FluentValidation;
using MediatR;
using Products.Application.Common.Exceptions;
using Products.Application.Common.Interfaces;
using Products.Application.Products.Models;
using Products.Domain.Enums;

namespace Products.Application.Products.PatchProduct;

public sealed record PatchProductCommand(
    Guid Id,
    string? Name,
    decimal? Price,
    decimal? OriginalPrice,
    bool? ClearOriginalPrice,
    bool? IsActive) : IRequest<ProductDto>;

public sealed class PatchProductCommandValidator : AbstractValidator<PatchProductCommand>
{
    public PatchProductCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(500).When(x => x.Name is not null);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0).When(x => x.Price.HasValue);
        RuleFor(x => x.OriginalPrice).GreaterThanOrEqualTo(0).When(x => x.OriginalPrice.HasValue);
    }
}

public sealed class PatchProductCommandHandler : IRequestHandler<PatchProductCommand, ProductDto>
{
    private readonly IProductRepository _products;
    private readonly IProductAuditWriter _audit;
    private readonly IUnitOfWork _uow;

    public PatchProductCommandHandler(
        IProductRepository products,
        IProductAuditWriter audit,
        IUnitOfWork uow)
    {
        _products = products;
        _audit = audit;
        _uow = uow;
    }

    public async Task<ProductDto> Handle(PatchProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _products.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException($"Product {request.Id} was not found.");

        var oldSnapshot = Clone(product);
        var changed = false;

        if (request.Name is not null)
        {
            var name = request.Name.Trim();
            if (name.Length == 0)
            {
                throw new ValidationException("Name must not be empty.");
            }

            if (!string.Equals(product.Name, name, StringComparison.Ordinal))
            {
                product.Name = name;
                changed = true;
            }
        }

        if (request.Price is { } price && product.Price != price)
        {
            product.Price = price;
            changed = true;
        }

        if (request.ClearOriginalPrice == true)
        {
            if (product.OriginalPrice is not null || product.OriginalCurrencyCode is not null)
            {
                product.OriginalPrice = null;
                product.OriginalCurrencyCode = null;
                changed = true;
            }
        }
        else if (request.OriginalPrice is { } originalPrice)
        {
            if (product.OriginalPrice != originalPrice)
            {
                product.OriginalPrice = originalPrice;
                product.OriginalCurrencyCode ??= product.CurrencyCode;
                changed = true;
            }
        }

        if (request.IsActive is { } isActive && product.IsActive != isActive)
        {
            product.IsActive = isActive;
            changed = true;
        }

        if (!changed)
        {
            return product.ToDto();
        }

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
            CategoryId = source.CategoryId,
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
