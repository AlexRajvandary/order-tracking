using MediatR;
using OrderTracking.Application.Common.Persistence;

namespace OrderTracking.Application.Statuses.DeactivateStatusDefinition;

public sealed class DeactivateStatusDefinitionCommandHandler
    : IRequestHandler<DeactivateStatusDefinitionCommand>
{
    private readonly IStatusDefinitionRepository _statusDefinitionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeactivateStatusDefinitionCommandHandler(
        IStatusDefinitionRepository statusDefinitionRepository,
        IUnitOfWork unitOfWork)
    {
        _statusDefinitionRepository = statusDefinitionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeactivateStatusDefinitionCommand request, CancellationToken cancellationToken)
    {
        var status = await _statusDefinitionRepository
            .GetByIdTrackedAsync(request.Id, cancellationToken)
            ?? throw new KeyNotFoundException($"Status '{request.Id}' was not found");

        status.IsActive = false;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
