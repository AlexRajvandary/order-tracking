using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Application.Common.Models;
using OrderTracking.Application.Customers.CreateCustomer;
using OrderTracking.Application.Customers.GetCustomerAddresses;
using OrderTracking.Application.Customers.GetCustomerById;
using OrderTracking.Application.Customers.GetCustomerOrders;
using OrderTracking.Application.Customers.GetCustomers;
using OrderTracking.Application.Customers.Models;
using OrderTracking.Application.Customers.SearchCustomers;
using OrderTracking.Application.Customers.UpdateCustomer;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/customers")]
[Authorize]
public sealed class CustomersController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<PaginatedList<CustomerDto>>> GetCustomers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(new GetCustomersQuery(page, pageSize), cancellationToken);
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<ActionResult<PaginatedList<CustomerDto>>> SearchCustomers(
        [FromQuery] string? q,
        [FromQuery] string? phone,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new SearchCustomersQuery(q, phone, page, pageSize),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> CreateCustomer(
        [FromBody] UpsertCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreateCustomerCommand(
                request.LastName,
                request.FirstName,
                request.Patronymic,
                request.Telegram,
                request.Phone,
                request.Email,
                request.Notes),
            cancellationToken);

        return CreatedAtAction(nameof(GetCustomerById), new { id = result.Id }, result);
    }

    [HttpGet("addresses")]
    public async Task<ActionResult<IReadOnlyList<CustomerAddressDto>>> GetUnassignedAddresses(
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetCustomerAddressesQuery(null),
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetCustomerById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCustomerByIdQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> UpdateCustomer(
        Guid id,
        [FromBody] UpsertCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new UpdateCustomerCommand(
                id,
                request.LastName,
                request.FirstName,
                request.Patronymic,
                request.Telegram,
                request.Phone,
                request.Email,
                request.Notes),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:guid}/orders")]
    public async Task<ActionResult<PaginatedList<CustomerOrderSummaryDto>>> GetCustomerOrders(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetCustomerOrdersQuery(id, page, pageSize),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:guid}/addresses")]
    public async Task<ActionResult<IReadOnlyList<CustomerAddressDto>>> GetCustomerAddresses(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetCustomerAddressesQuery(id), cancellationToken);
        return Ok(result);
    }
}

public sealed record UpsertCustomerRequest(
    string? LastName,
    string? FirstName,
    string? Patronymic,
    string? Telegram,
    string? Phone,
    string? Email,
    string? Notes);
