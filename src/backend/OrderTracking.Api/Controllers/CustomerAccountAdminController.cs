using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/customers/{customerId:guid}/account-notifications")]
[Authorize(Roles = "Moderator,Admin,SuperAdmin")]
public sealed class CustomerAccountAdminController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CustomerAccountNotificationSettingsDto>> Get(Guid customerId, CancellationToken cancellationToken)
    {
        var account = await db.AdminUsers.AsNoTracking().SingleOrDefaultAsync(user => user.CustomerId == customerId && user.Role == AdminRole.Buyer, cancellationToken);
        return account is null ? NotFound() : Ok(ToDto(account));
    }

    [HttpPut]
    public async Task<ActionResult<CustomerAccountNotificationSettingsDto>> Update(Guid customerId, [FromBody] UpdateCustomerAccountNotificationRequest request, CancellationToken cancellationToken)
    {
        var account = await db.AdminUsers.SingleOrDefaultAsync(user => user.CustomerId == customerId && user.Role == AdminRole.Buyer, cancellationToken);
        if (account is null) return NotFound();
        account.CustomerNotificationsDisabledByAdmin = request.DisabledByAdmin;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(account));
    }

    private static CustomerAccountNotificationSettingsDto ToDto(OrderTracking.Domain.Entities.AdminUser user) =>
        new(user.CustomerTelegramId is not null, user.CustomerNotificationsEnabled, user.CustomerNotificationsDisabledByAdmin);
}

public sealed record UpdateCustomerAccountNotificationRequest(bool DisabledByAdmin);
public sealed record CustomerAccountNotificationSettingsDto(bool TelegramLinked, bool EnabledByCustomer, bool DisabledByAdmin);
