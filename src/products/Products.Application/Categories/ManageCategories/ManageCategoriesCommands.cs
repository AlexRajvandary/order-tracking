using FluentValidation;
using MediatR;
using Products.Application.Categories.Models;
using Products.Application.Common.Exceptions;
using Products.Application.Common.Interfaces;
using Products.Domain.Entities;

namespace Products.Application.Categories.ManageCategories;

public sealed record CreateCategoryCommand(string Name, Guid? ParentId) : IRequest<CategoryDto>;
public sealed record RenameCategoryCommand(Guid Id, string Name) : IRequest<CategoryDto>;
public sealed record DeleteCategoryCommand(Guid Id) : IRequest<DeleteCategoryResult>;
public sealed record DeleteCategoryResult(int DeletedCategoriesCount, int UnassignedProductsCount);

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator() => RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
}

public sealed class RenameCategoryCommandValidator : AbstractValidator<RenameCategoryCommand>
{
    public RenameCategoryCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
    }
}

public sealed class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    private readonly ICategoryRepository _categories;
    private readonly IUnitOfWork _uow;

    public CreateCategoryCommandHandler(ICategoryRepository categories, IUnitOfWork uow)
    {
        _categories = categories;
        _uow = uow;
    }

    public async Task<CategoryDto> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        Category? parent = null;
        if (request.ParentId is { } parentId)
        {
            parent = await _categories.GetByIdAsync(parentId, cancellationToken)
                ?? throw new NotFoundException($"Category {parentId} was not found.");
            if (parent.ParentId is not null)
                throw new ValidationException("A subcategory cannot contain another subcategory.");
        }

        var name = request.Name.Trim();
        var slug = Slugify(name);
        if (await _categories.IsSlugTakenAsync(slug, parent?.Id, cancellationToken: cancellationToken))
            throw new ValidationException("A category with this name already exists at this level.");

        var category = new Category
        {
            Id = Guid.NewGuid(),
            ParentId = parent?.Id,
            Name = name,
            Slug = slug,
            IsActive = true,
        };
        _categories.Add(category);
        await _uow.SaveChangesAsync(cancellationToken);
        return ToDto(category);
    }

    internal static string Slugify(string value)
    {
        var slug = value.Trim().ToLowerInvariant();
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\u0400-\u04FF]+", "-");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }

    internal static CategoryDto ToDto(Category category) => new(
        category.Id, category.ParentId, category.Name, category.Slug,
        category.Description, category.ImageUrl, category.SortOrder,
        category.IsPopular, category.IsActive, 0, []);
}

public sealed class RenameCategoryCommandHandler : IRequestHandler<RenameCategoryCommand, CategoryDto>
{
    private readonly ICategoryRepository _categories;
    private readonly IUnitOfWork _uow;

    public RenameCategoryCommandHandler(ICategoryRepository categories, IUnitOfWork uow)
    {
        _categories = categories;
        _uow = uow;
    }

    public async Task<CategoryDto> Handle(RenameCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await _categories.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException($"Category {request.Id} was not found.");
        var name = request.Name.Trim();
        var slug = CreateCategoryCommandHandler.Slugify(name);
        if (await _categories.IsSlugTakenAsync(slug, category.ParentId, category.Id, cancellationToken))
            throw new ValidationException("A category with this name already exists at this level.");

        category.Name = name;
        category.Slug = slug;
        await _uow.SaveChangesAsync(cancellationToken);
        return CreateCategoryCommandHandler.ToDto(category);
    }
}

public sealed class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand, DeleteCategoryResult>
{
    private readonly ICategoryRepository _categories;
    private readonly IProductRepository _products;
    private readonly IUnitOfWork _uow;

    public DeleteCategoryCommandHandler(
        ICategoryRepository categories,
        IProductRepository products,
        IUnitOfWork uow)
    {
        _categories = categories;
        _products = products;
        _uow = uow;
    }

    public async Task<DeleteCategoryResult> Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        _ = await _categories.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException($"Category {request.Id} was not found.");
        var subtree = await _categories.ListSubtreeAsync(request.Id, cancellationToken);
        var unassigned = await _products.ClearCategoryAsync(subtree.Select(x => x.Id).ToList(), cancellationToken);
        foreach (var category in subtree)
            _categories.Remove(category);
        await _uow.SaveChangesAsync(cancellationToken);
        return new DeleteCategoryResult(subtree.Count, unassigned);
    }
}
