using FluentValidation;
using MediatR;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;
using Products.Domain.Enums;

namespace Products.Application.Products.ImportProducts;

public sealed record ImportProductsCommand(
    IReadOnlyList<ImportProductItem> Products,
    bool CreateMissingCategories = true) : IRequest<ImportProductsResult>;

public sealed record ImportProductItem(
    string? Name,
    decimal? Price,
    string? ImageUrl,
    string? Slug = null,
    string? Description = null,
    string? Sku = null,
    string? Brand = null,
    Guid? BrandId = null,
    string? BrandSlug = null,
    string? CurrencyCode = null,
    decimal? OriginalPrice = null,
    string? OriginalCurrencyCode = null,
    string? SourceUrl = null,
    string? Condition = null,
    Guid? ShopId = null,
    string? ShopName = null,
    string? ShopSlug = null,
    Guid? CategoryId = null,
    IReadOnlyList<string>? Categories = null,
    string? Category = null,
    string? CategoryName = null,
    string? CategorySlug = null,
    Guid? ParentCategoryId = null,
    string? ParentCategory = null,
    string? ParentCategoryName = null,
    string? ParentCategorySlug = null,
    bool IsActive = true);

public sealed record ImportProductsResult(
    int Total,
    int InsertedCount,
    int SkippedCount,
    int FailedCount,
    int CategoriesCreatedCount,
    int BrandsCreatedCount,
    int ShopsCreatedCount,
    IReadOnlyList<ImportProductIssue> Issues);

public sealed record ImportProductIssue(int Index, string? Name, string Status, string Message);

public sealed class ImportProductsCommandValidator : AbstractValidator<ImportProductsCommand>
{
    public ImportProductsCommandValidator()
    {
        RuleFor(x => x.Products).Cascade(CascadeMode.Stop).NotNull().NotEmpty().Must(x => x.Count <= 100)
            .WithMessage("A single import batch can contain at most 100 products.");
    }
}

public sealed class ImportProductsCommandHandler
    : IRequestHandler<ImportProductsCommand, ImportProductsResult>
{
    private readonly IProductRepository _products;
    private readonly ICategoryRepository _categories;
    private readonly IBrandRepository _brands;
    private readonly IShopRepository _shops;
    private readonly IProductAuditWriter _audit;
    private readonly IUnitOfWork _uow;

    public ImportProductsCommandHandler(
        IProductRepository products,
        ICategoryRepository categories,
        IBrandRepository brands,
        IShopRepository shops,
        IProductAuditWriter audit,
        IUnitOfWork uow)
    {
        _products = products;
        _categories = categories;
        _brands = brands;
        _shops = shops;
        _audit = audit;
        _uow = uow;
    }

    public async Task<ImportProductsResult> Handle(
        ImportProductsCommand request,
        CancellationToken cancellationToken)
    {
        var allCategories = (await _categories.ListAsync(false, cancellationToken)).ToList();
        var allBrands = (await _brands.ListAsync(false, cancellationToken)).ToList();
        var allShops = (await _shops.ListAsync(false, cancellationToken)).ToList();
        var issues = new List<ImportProductIssue>();
        var batchSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var batchSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var inserted = 0;
        var skipped = 0;
        var categoriesCreated = 0;
        var brandsCreated = 0;
        var shopsCreated = 0;

        for (var index = 0; index < request.Products.Count; index++)
        {
            var item = request.Products[index];
            var validationError = ValidateItem(item);
            if (validationError is not null)
            {
                issues.Add(new ImportProductIssue(index, item.Name, "failed", validationError));
                continue;
            }

            var referenceError = ValidateReferences(item, allCategories, allBrands, allShops);
            if (referenceError is not null)
            {
                issues.Add(new ImportProductIssue(index, item.Name, "failed", referenceError));
                continue;
            }

            var name = item.Name!.Trim();
            var sku = Clean(item.Sku);
            var hasExplicitSlug = !string.IsNullOrWhiteSpace(item.Slug);
            var requestedSlug = ImportSlug(hasExplicitSlug ? item.Slug! : name);

            if (sku is not null &&
                (batchSkus.Contains(sku) || await _products.IsSkuTakenAsync(sku, cancellationToken)))
            {
                skipped++;
                issues.Add(new ImportProductIssue(index, name, "skipped", "A product with this SKU already exists."));
                continue;
            }

            if (hasExplicitSlug &&
                (batchSlugs.Contains(requestedSlug) || await _products.IsSlugTakenAsync(requestedSlug, null, cancellationToken)))
            {
                skipped++;
                issues.Add(new ImportProductIssue(index, name, "skipped", "A product with this slug already exists."));
                continue;
            }

            var slug = requestedSlug;
            if (!hasExplicitSlug)
            {
                while (batchSlugs.Contains(slug) ||
                       await _products.IsSlugTakenAsync(slug, null, cancellationToken))
                {
                    slug = $"{requestedSlug}-{Guid.NewGuid().ToString("N")[..6]}";
                }
            }

            var categoryResult = ResolveCategory(item, allCategories, request.CreateMissingCategories);
            if (categoryResult.Error is not null)
            {
                issues.Add(new ImportProductIssue(index, name, "failed", categoryResult.Error));
                continue;
            }
            categoriesCreated += categoryResult.CreatedCount;

            var brandResult = ResolveBrand(item, allBrands);
            if (brandResult.Error is not null)
            {
                issues.Add(new ImportProductIssue(index, name, "failed", brandResult.Error));
                continue;
            }
            if (brandResult.Created) brandsCreated++;

            var shopResult = ResolveShop(item, allShops);
            if (shopResult.Error is not null)
            {
                issues.Add(new ImportProductIssue(index, name, "failed", shopResult.Error));
                continue;
            }
            if (shopResult.Created) shopsCreated++;

            var product = new Product
            {
                Id = Guid.NewGuid(),
                Name = name,
                Slug = slug,
                Description = Clean(item.Description),
                Sku = sku,
                Brand = brandResult.Brand?.Name ?? Clean(item.Brand),
                BrandId = brandResult.Brand?.Id,
                Price = item.Price!.Value,
                CurrencyCode = (Clean(item.CurrencyCode) ?? "RUB").ToUpperInvariant(),
                OriginalPrice = item.OriginalPrice,
                OriginalCurrencyCode = Clean(item.OriginalCurrencyCode)?.ToUpperInvariant(),
                ImageUrl = item.ImageUrl!.Trim(),
                SourceUrl = Clean(item.SourceUrl),
                Condition = ListProducts.ListProductsQueryHandler.TryParseCondition(
                    item.Condition ?? "new", out var condition)
                    ? condition
                    : ProductCondition.New,
                ShopId = shopResult.Shop?.Id,
                CategoryId = categoryResult.Category?.Id,
                IsActive = item.IsActive,
            };

            if (sku is not null) batchSkus.Add(sku);
            batchSlugs.Add(slug);
            _products.Add(product);
            await _audit.WriteAsync(product.Id, ProductAuditActions.Created, null, product, cancellationToken);
            inserted++;
        }

        if (inserted > 0 || categoriesCreated > 0 || brandsCreated > 0 || shopsCreated > 0)
            await _uow.SaveChangesAsync(cancellationToken);

        return new ImportProductsResult(
            request.Products.Count,
            inserted,
            skipped,
            issues.Count(x => x.Status == "failed"),
            categoriesCreated,
            brandsCreated,
            shopsCreated,
            issues);
    }

    private static string? ValidateItem(ImportProductItem item)
    {
        if (string.IsNullOrWhiteSpace(item.Name)) return "Name is required.";
        if (item.Name.Trim().Length > 500) return "Name cannot exceed 500 characters.";
        if (Clean(item.Sku) is { Length: > 100 }) return "Sku cannot exceed 100 characters.";
        if (Clean(item.Brand) is { Length: > 200 }) return "Brand cannot exceed 200 characters.";
        if (!item.Price.HasValue || item.Price < 0) return "Price must be zero or greater.";
        if (string.IsNullOrWhiteSpace(item.ImageUrl)) return "ImageUrl is required.";
        if (item.ImageUrl.Trim().Length > 2000) return "ImageUrl cannot exceed 2000 characters.";
        if (Clean(item.SourceUrl) is { Length: > 2000 }) return "SourceUrl cannot exceed 2000 characters.";
        if (Clean(item.ShopName) is { Length: > 200 }) return "ShopName cannot exceed 200 characters.";
        if (CategoryName(item) is { Length: > 200 }) return "Category name cannot exceed 200 characters.";
        if (ParentCategoryName(item) is { Length: > 200 })
            return "Parent category name cannot exceed 200 characters.";
        if (Clean(item.CurrencyCode) is { Length: not 3 }) return "CurrencyCode must contain 3 characters.";
        if (item.OriginalPrice < 0) return "OriginalPrice must be zero or greater.";
        if (item.OriginalPrice.HasValue && string.IsNullOrWhiteSpace(item.OriginalCurrencyCode))
            return "OriginalCurrencyCode is required when OriginalPrice is set.";
        if (Clean(item.OriginalCurrencyCode) is { Length: not 3 })
            return "OriginalCurrencyCode must contain 3 characters.";
        return null;
    }

    private static string? ValidateReferences(
        ImportProductItem item,
        IReadOnlyList<Category> categories,
        IReadOnlyList<Brand> brands,
        IReadOnlyList<Shop> shops)
    {
        if (item.CategoryId is { } categoryId && categories.All(x => x.Id != categoryId))
            return $"Category '{categoryId}' was not found.";
        if (item.ParentCategoryId is { } parentId && categories.All(x => x.Id != parentId))
            return $"Parent category '{parentId}' was not found.";
        if (item.BrandId is { } brandId && brands.All(x => x.Id != brandId))
            return $"Brand '{brandId}' was not found.";
        if (item.ShopId is { } shopId && shops.All(x => x.Id != shopId))
            return $"Shop '{shopId}' was not found.";
        return null;
    }

    private (Category? Category, int CreatedCount, string? Error) ResolveCategory(
        ImportProductItem item,
        List<Category> all,
        bool createMissing)
    {
        if (item.CategoryId is { } categoryId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == categoryId);
            return existingById is null
                ? (null, 0, $"Category '{categoryId}' was not found.")
                : (existingById, 0, null);
        }

        var name = CategoryName(item);
        var slugSource = Clean(item.CategorySlug) ?? name;
        if (slugSource is null) return (null, 0, null);

        var parentResult = ResolveParentCategory(item, all, createMissing);
        if (parentResult.Error is not null) return (null, parentResult.CreatedCount, parentResult.Error);

        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x =>
            x.ParentId == parentResult.Category?.Id &&
            string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, parentResult.CreatedCount, null);
        if (!createMissing)
            return (null, parentResult.CreatedCount, $"Category '{name ?? slug}' was not found.");

        var category = NewCategory(name ?? slug, slug, parentResult.Category?.Id);
        _categories.Add(category);
        all.Add(category);
        return (category, parentResult.CreatedCount + 1, null);
    }

    private (Category? Category, int CreatedCount, string? Error) ResolveParentCategory(
        ImportProductItem item,
        List<Category> all,
        bool createMissing)
    {
        if (item.ParentCategoryId is { } parentId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == parentId);
            return existingById is null
                ? (null, 0, $"Parent category '{parentId}' was not found.")
                : (existingById, 0, null);
        }

        var name = ParentCategoryName(item);
        var slugSource = Clean(item.ParentCategorySlug) ?? name;
        if (slugSource is null) return (null, 0, null);

        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x => x.ParentId is null &&
            string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, 0, null);
        if (!createMissing) return (null, 0, $"Parent category '{name ?? slug}' was not found.");

        var category = NewCategory(name ?? slug, slug, null);
        _categories.Add(category);
        all.Add(category);
        return (category, 1, null);
    }

    private (Brand? Brand, bool Created, string? Error) ResolveBrand(
        ImportProductItem item,
        List<Brand> all)
    {
        if (item.BrandId is { } brandId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == brandId);
            return existingById is null
                ? (null, false, $"Brand '{brandId}' was not found.")
                : (existingById, false, null);
        }

        var name = Clean(item.Brand);
        var slugSource = Clean(item.BrandSlug) ?? name;
        if (slugSource is null) return (null, false, null);
        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x => string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, false, null);

        var brand = new Brand { Id = Guid.NewGuid(), Name = name ?? slug, Slug = slug };
        _brands.Add(brand);
        all.Add(brand);
        return (brand, true, null);
    }

    private (Shop? Shop, bool Created, string? Error) ResolveShop(
        ImportProductItem item,
        List<Shop> all)
    {
        if (item.ShopId is { } shopId)
        {
            var existingById = all.FirstOrDefault(x => x.Id == shopId);
            return existingById is null
                ? (null, false, $"Shop '{shopId}' was not found.")
                : (existingById, false, null);
        }

        var name = Clean(item.ShopName);
        var slugSource = Clean(item.ShopSlug) ?? name;
        if (slugSource is null) return (null, false, null);
        var slug = ImportSlug(slugSource);
        var existing = all.FirstOrDefault(x => string.Equals(x.Slug, slug, StringComparison.OrdinalIgnoreCase));
        if (existing is not null) return (existing, false, null);

        var shop = new Shop { Id = Guid.NewGuid(), Name = name ?? slug, Slug = slug };
        _shops.Add(shop);
        all.Add(shop);
        return (shop, true, null);
    }

    private static Category NewCategory(string name, string slug, Guid? parentId) => new()
    {
        Id = Guid.NewGuid(),
        Name = name,
        Slug = slug,
        ParentId = parentId,
        IsActive = true,
    };

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? CategoryName(ImportProductItem item) =>
        Clean(item.CategoryName)
        ?? Clean(item.Category)
        ?? item.Categories?.Select(Clean).LastOrDefault(x => x is not null);

    private static string? ParentCategoryName(ImportProductItem item) =>
        Clean(item.ParentCategoryName)
        ?? Clean(item.ParentCategory)
        ?? item.Categories?.Select(Clean).Where(x => x is not null).Reverse().Skip(1).FirstOrDefault();

    private static string ImportSlug(string value)
    {
        var slug = ProductMappings.Slugify(value);
        return slug.Length <= 190 ? slug : slug[..190].TrimEnd('-');
    }
}
