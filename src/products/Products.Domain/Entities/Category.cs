using Products.Domain.Common;

namespace Products.Domain.Entities;

public class Category : AuditableEntity
{
    public Guid? ParentId { get; set; }
    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();

    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsPopular { get; set; }
    public bool IsActive { get; set; } = true;
}
