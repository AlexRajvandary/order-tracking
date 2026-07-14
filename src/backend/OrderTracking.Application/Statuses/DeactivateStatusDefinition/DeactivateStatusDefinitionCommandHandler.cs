using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Application.Statuses.DeactivateStatusDefinition;

public sealed class DeactivateStatusDefinitionCommandHandler
    : IRequestHandler<DeactivateStatusDefinitionCommand>
{
    private readonly IApplicationDbContext _context;

    public DeactivateStatusDefinitionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeactivateStatusDefinitionCommand request, CancellationToken cancellationToken)
    {
        var status = await _context.StatusDefinitions
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Status '{request.Id}' was not found");

        status.IsActive = false;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
