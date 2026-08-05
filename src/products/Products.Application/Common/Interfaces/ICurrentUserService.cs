namespace Products.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? AdminId { get; }
    string? Login { get; }
    bool IsAuthenticated { get; }
}
