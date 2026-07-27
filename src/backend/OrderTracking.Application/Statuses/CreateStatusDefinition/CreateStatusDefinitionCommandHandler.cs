using MediatR;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Application.Statuses.Models;
using OrderTracking.Domain.Entities;

namespace OrderTracking.Application.Statuses.CreateStatusDefinition;

public sealed class CreateStatusDefinitionCommandHandler
    : IRequestHandler<CreateStatusDefinitionCommand, StatusDefinitionDto>
{
    private readonly IStatusDefinitionRepository _statusDefinitionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateStatusDefinitionCommandHandler(
        IStatusDefinitionRepository statusDefinitionRepository,
        IUnitOfWork unitOfWork)
    {
        _statusDefinitionRepository = statusDefinitionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<StatusDefinitionDto> Handle(
        CreateStatusDefinitionCommand request,
        CancellationToken cancellationToken)
    {
        var status = new StatusDefinition
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            ItemType = request.ItemType,
            Color = string.IsNullOrWhiteSpace(request.Color) ? null : request.Color.Trim(),
            DefaultCountry = string.IsNullOrWhiteSpace(request.DefaultCountry)
                ? null
                : request.DefaultCountry.Trim(),
            DefaultLocation = string.IsNullOrWhiteSpace(request.DefaultLocation)
                ? null
                : request.DefaultLocation.Trim(),
            PublishAfterDays = request.PublishAfterDays is > 0 ? request.PublishAfterDays : null,
            SortOrder = request.SortOrder,
            IsActive = true,
            IsFinal = request.IsFinal,
        };

        _statusDefinitionRepository.Add(status);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Map(status);
    }

    internal static StatusDefinitionDto Map(StatusDefinition s) =>
        new(
            s.Id,
            s.Name,
            s.ItemType?.ToString(),
            s.Color,
            s.DefaultCountry,
            s.DefaultLocation,
            s.PublishAfterDays,
            s.SortOrder,
            s.IsActive,
            s.IsFinal,
            s.CreatedAt);
}
