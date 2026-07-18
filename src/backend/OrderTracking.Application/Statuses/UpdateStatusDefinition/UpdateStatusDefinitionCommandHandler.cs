using MediatR;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Statuses.CreateStatusDefinition;
using OrderTracking.Application.Statuses.Models;

namespace OrderTracking.Application.Statuses.UpdateStatusDefinition;

public sealed class UpdateStatusDefinitionCommandHandler
    : IRequestHandler<UpdateStatusDefinitionCommand, StatusDefinitionDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateStatusDefinitionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<StatusDefinitionDto> Handle(
        UpdateStatusDefinitionCommand request,
        CancellationToken cancellationToken)
    {
        var status = await _context.StatusDefinitions
            .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Status '{request.Id}' was not found");

        status.Name = request.Name.Trim();
        status.ItemType = request.ItemType;
        status.Color = string.IsNullOrWhiteSpace(request.Color) ? null : request.Color.Trim();
        status.DefaultCountry = string.IsNullOrWhiteSpace(request.DefaultCountry)
            ? null
            : request.DefaultCountry.Trim();
        status.DefaultLocation = string.IsNullOrWhiteSpace(request.DefaultLocation)
            ? null
            : request.DefaultLocation.Trim();
        status.PublishAfterDays = request.PublishAfterDays is > 0 ? request.PublishAfterDays : null;
        status.SortOrder = request.SortOrder;
        status.IsActive = request.IsActive;
        status.IsFinal = request.IsFinal;

        await _context.SaveChangesAsync(cancellationToken);

        return CreateStatusDefinitionCommandHandler.Map(status);
    }
}
