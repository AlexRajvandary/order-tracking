using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using OrderTracking.Api.Auth;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Models;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Identity;
using OrderTracking.Infrastructure.Persistence;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/v1/customer-account")]
public sealed class CustomerAccountController(
    ApplicationDbContext db,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    IRefreshTokenService refreshTokenService,
    ICustomerOrderClaimService orderClaims,
    ITransactionalEmailSender emailSender,
    CustomerTelegramOAuthClient telegramOAuth,
    IOptions<JwtSettings> jwtSettings,
    IHostEnvironment environment,
    ILogger<CustomerAccountController> logger) : ControllerBase
{
    private const int OtpLifetimeMinutes = 10;
    private const int OtpMaxAttempts = 5;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpPost("email/login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthTokensDto>> LoginByEmail([FromBody] EmailLoginRequest request, CancellationToken cancellationToken)
    {
        var login = NormalizeEmail(request.Email);
        var user = await db.AdminUsers.SingleOrDefaultAsync(item => item.Role == AdminRole.Buyer && item.IsActive &&
            (item.Login.ToLower() == login || item.Email != null && item.Email.ToLower() == login), cancellationToken);
        if (user is null || !passwordHasher.Verify(user, request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Неверный email или пароль." });
        user.LastSeenAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        var result = await IssueTokensAsync(user, cancellationToken);
        SetRefreshCookie(result.RefreshToken);
        return Ok(result.Tokens.Tokens);
    }

    [HttpPost("email/register/send-code")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> SendRegistrationCode([FromBody] RegisterEmailRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (!IsValidEmail(email)) return BadRequest(new { message = "Укажите корректный email." });
        if (request.Password.Length is < 8 or > 128) return BadRequest(new { message = "Пароль должен содержать от 8 до 128 символов." });
        if (!emailSender.IsConfigured) return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Отправка email пока не настроена." });
        if (await EmailAlreadyUsedAsync(email, cancellationToken)) return Conflict(new { message = "Аккаунт с таким email уже существует." });

        var throttle = await CheckOtpThrottleAsync(email, "register", cancellationToken);
        if (throttle is not null) return StatusCode(StatusCodes.Status429TooManyRequests, new { message = throttle });

        var user = new AdminUser { Id = Guid.NewGuid(), Login = email, Email = email, Role = AdminRole.Buyer };
        var passwordHash = passwordHasher.Hash(user, request.Password);
        var code = await CreateOtpAsync(email, "register", passwordHash, NormalizeName(request.Name), userId: null, cancellationToken);
        return code ? Accepted(new { expiresInSeconds = OtpLifetimeMinutes * 60 }) : StatusCode(StatusCodes.Status502BadGateway, new { message = "Не удалось отправить письмо. Попробуйте ещё раз." });
    }

    [HttpPost("email/register/verify-code")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthTokensDto>> VerifyRegistrationCode([FromBody] VerifyEmailCodeRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (!IsValidEmail(email)) return BadRequest(new { message = "Укажите корректный email." });
        var challenge = await FindOtpAsync(email, "register", cancellationToken);
        if (!await VerifyOtpAsync(challenge, request.Code, email, "register", cancellationToken)) return Unauthorized(new { message = "Код неверный или срок его действия истёк." });
        if (challenge!.PasswordHash is null) return BadRequest(new { message = "Срок регистрации истёк. Запросите новый код." });
        if (await EmailAlreadyUsedAsync(email, cancellationToken)) return Conflict(new { message = "Аккаунт с таким email уже существует." });
        var canClaimOrder = await IsClaimTokenValidAsync(request.ClaimToken, cancellationToken);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var customer = request.ClaimToken is null
            ? new Customer { Id = Guid.NewGuid(), Email = email, FirstName = challenge.DisplayName, CreatedAt = now, UpdatedAt = now }
            : null;
        if (customer is not null) db.Customers.Add(customer);
        var user = new AdminUser
        {
            Id = Guid.NewGuid(), Login = email, Email = email, EmailVerifiedAt = now,
            PasswordHash = challenge.PasswordHash, DisplayName = challenge.DisplayName,
            Role = AdminRole.Buyer, IsActive = true, SettingsJson = "{}",
            CustomerId = customer?.Id, CustomerNotificationsEnabled = true,
            CreatedAt = now, UpdatedAt = now,
        };
        db.AdminUsers.Add(user);
        challenge.ConsumedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        if (canClaimOrder && !string.IsNullOrWhiteSpace(request.ClaimToken))
            await orderClaims.ClaimAsync(user.Id, request.ClaimToken, cancellationToken);

        var result = await IssueTokensAsync(user, cancellationToken);
        SetRefreshCookie(result.RefreshToken);
        return Ok(result.Tokens.Tokens);
    }

    [HttpPost("email/password-reset/send-code")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> SendPasswordResetCode([FromBody] EmailRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (!IsValidEmail(email)) return BadRequest(new { message = "Укажите корректный email." });
        if (!emailSender.IsConfigured) return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Отправка email пока не настроена." });
        var userExists = await db.AdminUsers.AnyAsync(user => user.Role == AdminRole.Buyer && user.IsActive && user.Email != null && user.Email.ToLower() == email, cancellationToken);
        if (userExists)
        {
            var throttle = await CheckOtpThrottleAsync(email, "reset", cancellationToken);
            if (throttle is not null) return StatusCode(StatusCodes.Status429TooManyRequests, new { message = throttle });
            await CreateOtpAsync(email, "reset", null, null, userId: null, cancellationToken);
        }
        return Accepted(new { message = "Если аккаунт с таким email существует, письмо с кодом уже отправлено." });
    }

    [HttpPost("email/claim")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> ClaimOrder([FromBody] ClaimOrderRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        try { await orderClaims.ClaimAsync(userId, request.Token, cancellationToken); return NoContent(); }
        catch (UnauthorizedAccessException) { return BadRequest(new { message = "Ссылка на заявку истекла или уже использована." }); }
    }

    [HttpPost("email/password-reset/complete")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> CompletePasswordReset([FromBody] CompletePasswordResetRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (!IsValidEmail(email) || request.NewPassword.Length is < 8 or > 128)
            return BadRequest(new { message = "Проверьте email и пароль (от 8 до 128 символов)." });
        var challenge = await FindOtpAsync(email, "reset", cancellationToken);
        if (!await VerifyOtpAsync(challenge, request.Code, email, "reset", cancellationToken)) return Unauthorized(new { message = "Код неверный или срок его действия истёк." });
        var user = await db.AdminUsers.SingleOrDefaultAsync(item => item.Role == AdminRole.Buyer && item.IsActive && item.Email != null && item.Email.ToLower() == email, cancellationToken);
        if (user is null) return Accepted(new { message = "Если аккаунт с таким email существует, пароль обновлён." });
        user.PasswordHash = passwordHasher.Hash(user, request.NewPassword);
        challenge!.ConsumedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await refreshTokenService.RevokeAllForUserAsync(user.Id, cancellationToken);
        AuthCookieHelper.ClearRefreshTokenCookie(Response, environment);
        return NoContent();
    }

    [HttpPost("email/change/send-code")]
    [Authorize(Roles = "Buyer")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> SendEmailChangeCode([FromBody] EmailRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var email = NormalizeEmail(request.Email);
        if (!IsValidEmail(email)) return BadRequest(new { message = "Укажите корректный email." });
        if (!emailSender.IsConfigured) return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Отправка email пока не настроена." });
        if (await EmailAlreadyUsedAsync(email, cancellationToken)) return Conflict(new { message = "Этот email уже используется." });
        var throttle = await CheckOtpThrottleAsync(email, "email-change", cancellationToken);
        if (throttle is not null) return StatusCode(StatusCodes.Status429TooManyRequests, new { message = throttle });
        var code = await CreateOtpAsync(email, "email-change", null, null, userId, cancellationToken);
        return code ? Accepted(new { expiresInSeconds = OtpLifetimeMinutes * 60 }) : StatusCode(StatusCodes.Status502BadGateway);
    }

    [HttpPost("email/change/verify-code")]
    [Authorize(Roles = "Buyer")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyEmailChangeCode([FromBody] VerifyEmailCodeRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var email = NormalizeEmail(request.Email);
        var challenge = await FindOtpAsync(email, "email-change", cancellationToken);
        if (challenge?.UserId != userId || !await VerifyOtpAsync(challenge, request.Code, email, "email-change", cancellationToken))
            return Unauthorized(new { message = "Код неверный или срок его действия истёк." });
        if (await EmailAlreadyUsedAsync(email, cancellationToken, userId)) return Conflict(new { message = "Этот email уже используется." });
        var user = await db.AdminUsers.Include(item => item.Customer).SingleAsync(item => item.Id == userId && item.Role == AdminRole.Buyer, cancellationToken);
        var oldEmail = user.Email;
        user.Email = email;
        user.EmailVerifiedAt = DateTimeOffset.UtcNow;
        if (string.Equals(user.Login, oldEmail, StringComparison.OrdinalIgnoreCase)) user.Login = email;
        if (user.Customer is not null) user.Customer.Email = email;
        challenge!.ConsumedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("telegram/login/start")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<TelegramAuthorizationStartDto>> StartTelegramLogin(CancellationToken cancellationToken)
    {
        var started = await StartTelegramAuthorizationAsync("login", userId: null, cancellationToken);
        return started is null ? StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Вход через Telegram пока не настроен." }) : Ok(started);
    }

    [HttpPost("telegram/link/start")]
    [Authorize(Roles = "Buyer")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<TelegramAuthorizationStartDto>> StartTelegramLink(CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var started = await StartTelegramAuthorizationAsync("link", userId, cancellationToken);
        return started is null ? StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Вход через Telegram пока не настроен." }) : Ok(started);
    }

    [HttpPost("telegram/complete")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> CompleteTelegramLogin([FromBody] CompleteTelegramLoginRequest request, CancellationToken cancellationToken)
    {
        var stateHash = Hash(request.State);
        var state = await db.CustomerTelegramLoginStates.SingleOrDefaultAsync(item => item.StateHash == stateHash, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        if (state is null || state.UsedAt is not null || state.ExpiresAt <= now)
            return Unauthorized(new { message = "Сессия входа в Telegram истекла. Начните вход заново." });
        state.UsedAt = now;
        await db.SaveChangesAsync(cancellationToken);

        if (state.Purpose == "link")
        {
            if (!TryGetBuyerId(out var currentUserId) || currentUserId != state.UserId)
                return Unauthorized(new { message = "Для привязки Telegram войдите в свой аккаунт и повторите попытку." });
        }

        CustomerTelegramIdentity telegramUser;
        try
        {
            telegramUser = await telegramOAuth.ExchangeAndValidateAsync(request.Code, state.CodeVerifier, state.Nonce, cancellationToken);
        }
        catch (Exception exception) when (exception is UnauthorizedAccessException or HttpRequestException or JsonException or SecurityTokenException)
        {
            logger.LogWarning(exception, "Telegram OAuth callback validation failed");
            return Unauthorized(new { message = "Не удалось подтвердить вход через Telegram. Попробуйте ещё раз." });
        }

        var canClaimTelegramOrder = await IsClaimTokenValidAsync(request.ClaimToken, cancellationToken);
        var duplicate = await db.AdminUsers.SingleOrDefaultAsync(user => user.CustomerTelegramId == telegramUser.Id && user.IsActive, cancellationToken);
        AdminUser account;
        if (state.Purpose == "link")
        {
            account = await db.AdminUsers.Include(user => user.Customer)
                .SingleAsync(user => user.Id == state.UserId && user.Role == AdminRole.Buyer && user.IsActive, cancellationToken);
            if (duplicate is not null && duplicate.Id != account.Id) return Conflict(new { message = "Этот Telegram уже привязан к другому аккаунту." });
            account.CustomerTelegramId = telegramUser.Id;
            account.TelegramUsername = NormalizeTelegramUsername(telegramUser.Username);
            account.TelegramAvatarUrl = telegramUser.PhotoUrl;
            if (!account.CustomerNotificationsDisabledByAdmin) account.CustomerNotificationsEnabled = true;
            await db.SaveChangesAsync(cancellationToken);
            await orderClaims.NotifyRecentlyClaimedOrdersAsync(account.Id, cancellationToken);
            return NoContent();
        }

        account = duplicate ?? await CreateTelegramBuyerAsync(telegramUser, canClaimTelegramOrder, cancellationToken);
        if (account.Role != AdminRole.Buyer || !account.IsActive) return Unauthorized();
        account.TelegramUsername = NormalizeTelegramUsername(telegramUser.Username);
        account.TelegramAvatarUrl = telegramUser.PhotoUrl;
        if (!account.CustomerNotificationsDisabledByAdmin) account.CustomerNotificationsEnabled = true;
        await db.SaveChangesAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(request.ClaimToken))
        {
            if (canClaimTelegramOrder)
                await orderClaims.ClaimAsync(account.Id, request.ClaimToken, cancellationToken);
        }
        var result = await IssueTokensAsync(account, cancellationToken);
        SetRefreshCookie(result.RefreshToken);
        return Ok(result.Tokens.Tokens);
    }

    [HttpGet("telegram/status")]
    [Authorize(Roles = "Buyer")]
    public async Task<ActionResult<TelegramLinkStatusDto>> GetTelegramStatus(CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var account = await db.AdminUsers.AsNoTracking().SingleAsync(user => user.Id == userId, cancellationToken);
        return Ok(new TelegramLinkStatusDto(telegramOAuth.IsConfigured, account.CustomerTelegramId is not null,
            account.TelegramUsername, account.CustomerNotificationsEnabled, account.CustomerNotificationsDisabledByAdmin));
    }

    [HttpDelete("telegram")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> UnlinkTelegram(CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var account = await db.AdminUsers.SingleAsync(user => user.Id == userId, cancellationToken);
        account.CustomerTelegramId = null;
        account.TelegramUsername = null;
        account.TelegramAvatarUrl = null;
        account.CustomerNotificationsEnabled = false;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("profile")]
    [Authorize(Roles = "Buyer")]
    public async Task<ActionResult<CustomerAccountProfileDto>> GetProfile(CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var account = await db.AdminUsers.AsNoTracking().Include(user => user.Customer)
            .SingleOrDefaultAsync(user => user.Id == userId && user.IsActive, cancellationToken);
        if (account is null) return Unauthorized();
        var customer = account.Customer;
        return Ok(new CustomerAccountProfileDto(account.Id, account.Email, account.EmailVerifiedAt is not null,
            account.DisplayName, customer?.Phone, customer?.Telegram, customer?.WhatsApp, customer?.Vk,
            account.CustomerTelegramId is not null, account.CustomerNotificationsEnabled,
            account.CustomerNotificationsDisabledByAdmin));
    }

    [HttpPut("profile")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateCustomerAccountRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var account = await db.AdminUsers.Include(user => user.Customer).SingleOrDefaultAsync(user => user.Id == userId && user.IsActive, cancellationToken);
        if (account is null) return Unauthorized();
        account.DisplayName = NormalizeName(request.Name);
        account.Customer ??= new Customer { Id = Guid.NewGuid(), CreatedAt = DateTimeOffset.UtcNow };
        if (account.Customer.Id == Guid.Empty) account.Customer.Id = Guid.NewGuid();
        account.Customer.FirstName = account.DisplayName;
        account.Customer.Phone = Normalize(request.Phone);
        account.Customer.Telegram = Normalize(request.Telegram);
        account.Customer.WhatsApp = Normalize(request.WhatsApp);
        account.Customer.Vk = Normalize(request.Vk);
        account.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("orders")]
    [Authorize(Roles = "Buyer")]
    public async Task<ActionResult<IReadOnlyList<CustomerOrderDto>>> GetOrders(CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var orders = await (from claim in db.CustomerOrderClaims.AsNoTracking()
            join order in db.Orders.AsNoTracking() on claim.OrderId equals order.Id
            where claim.ClaimedByUserId == userId && claim.ClaimedAt != null
            orderby order.CreatedAt descending
            select new CustomerOrderDto(order.Id, order.TrackingCode, order.Status, order.CreatedAt,
                order.Items.OrderBy(item => item.SortOrder).Select(item => new CustomerOrderItemDto(item.Name, item.Description, item.Quantity, item.ImageUrl)).ToList()))
            .Take(200)
            .ToListAsync(cancellationToken);
        return Ok(orders);
    }

    [HttpGet("addresses")]
    [Authorize(Roles = "Buyer")]
    public async Task<ActionResult<IReadOnlyList<CustomerAccountAddressDto>>> GetAddresses(CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var customerId = await db.AdminUsers.Where(user => user.Id == userId).Select(user => user.CustomerId).SingleAsync(cancellationToken);
        if (customerId is null) return Ok(Array.Empty<CustomerAccountAddressDto>());
        return Ok(await db.CustomerAddresses.AsNoTracking().Where(address => address.CustomerId == customerId)
            .OrderByDescending(address => address.CreatedAt)
            .Select(address => new CustomerAccountAddressDto(address.Id, address.City, address.Street, address.Building,
                address.Apartment, address.PostalCode, address.Note)).ToListAsync(cancellationToken));
    }

    [HttpPost("addresses")]
    [Authorize(Roles = "Buyer")]
    public async Task<ActionResult<CustomerAccountAddressDto>> CreateAddress([FromBody] CustomerAddressRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var customerId = await EnsureCustomerAsync(userId, cancellationToken);
        var address = new CustomerAddress
        {
            Id = Guid.NewGuid(), CustomerId = customerId, City = Normalize(request.City), Street = Normalize(request.Street),
            Building = Normalize(request.Building), Apartment = Normalize(request.Apartment), PostalCode = Normalize(request.PostalCode),
            Note = Normalize(request.Note), CreatedAt = DateTimeOffset.UtcNow,
        };
        db.CustomerAddresses.Add(address);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToAddressDto(address));
    }

    [HttpPut("addresses/{id:guid}")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> UpdateAddress(Guid id, [FromBody] CustomerAddressRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var customerId = await db.AdminUsers.Where(user => user.Id == userId).Select(user => user.CustomerId).SingleAsync(cancellationToken);
        var address = await db.CustomerAddresses.SingleOrDefaultAsync(item => item.Id == id && item.CustomerId == customerId, cancellationToken);
        if (address is null) return NotFound();
        address.City = Normalize(request.City); address.Street = Normalize(request.Street); address.Building = Normalize(request.Building);
        address.Apartment = Normalize(request.Apartment); address.PostalCode = Normalize(request.PostalCode); address.Note = Normalize(request.Note);
        address.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("addresses/{id:guid}")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> DeleteAddress(Guid id, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var customerId = await db.AdminUsers.Where(user => user.Id == userId).Select(user => user.CustomerId).SingleAsync(cancellationToken);
        var address = await db.CustomerAddresses.SingleOrDefaultAsync(item => item.Id == id && item.CustomerId == customerId, cancellationToken);
        if (address is null) return NotFound();
        db.CustomerAddresses.Remove(address);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPut("notifications")]
    [Authorize(Roles = "Buyer")]
    public async Task<IActionResult> UpdateNotifications([FromBody] UpdateCustomerNotificationsRequest request, CancellationToken cancellationToken)
    {
        if (!TryGetBuyerId(out var userId)) return Unauthorized();
        var account = await db.AdminUsers.SingleAsync(user => user.Id == userId, cancellationToken);
        if (request.Enabled && account.CustomerNotificationsDisabledByAdmin)
            return Conflict(new { message = "Уведомления приостановлены администратором. Обратитесь в поддержку." });
        if (request.Enabled && account.CustomerTelegramId is null)
            return Conflict(new { message = "Сначала привяжите Telegram." });
        account.CustomerNotificationsEnabled = request.Enabled;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<TelegramAuthorizationStartDto?> StartTelegramAuthorizationAsync(string purpose, Guid? userId, CancellationToken cancellationToken)
    {
        if (!telegramOAuth.IsConfigured) return null;
        var state = RandomToken();
        var nonce = RandomToken();
        var verifier = RandomToken();
        var challenge = Base64UrlEncoder.Encode(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var entity = new CustomerTelegramLoginState
        {
            Id = Guid.NewGuid(), StateHash = Hash(state), Nonce = nonce, CodeVerifier = verifier,
            Purpose = purpose, UserId = userId, ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10), CreatedAt = DateTimeOffset.UtcNow,
        };
        db.CustomerTelegramLoginStates.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return new TelegramAuthorizationStartDto(telegramOAuth.CreateAuthorizationUrl(state, nonce, challenge));
    }

    private async Task<AdminUser> CreateTelegramBuyerAsync(CustomerTelegramIdentity identity, bool deferCustomerForClaim, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var name = NormalizeName(identity.Name) ?? "Покупатель";
        var customer = deferCustomerForClaim ? null : new Customer
        {
            Id = Guid.NewGuid(), FirstName = name,
            Telegram = string.IsNullOrWhiteSpace(identity.Username) ? null : "@" + identity.Username.TrimStart('@'),
            CreatedAt = now, UpdatedAt = now,
        };
        var user = new AdminUser
        {
            Id = Guid.NewGuid(), Login = $"tg_{identity.Id}", DisplayName = name,
            PasswordHash = passwordHasher.Hash(new AdminUser { Id = Guid.NewGuid(), Login = $"tg_{identity.Id}" }, RandomToken()),
            Role = AdminRole.Buyer, IsActive = true, CustomerTelegramId = identity.Id,
            TelegramUsername = NormalizeTelegramUsername(identity.Username), TelegramAvatarUrl = identity.PhotoUrl,
            CustomerNotificationsEnabled = true, CustomerId = customer?.Id, SettingsJson = "{}",
            CreatedAt = now, UpdatedAt = now,
        };
        if (customer is not null) db.Customers.Add(customer);
        db.AdminUsers.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user;
    }

    private async Task<(AuthResultDto Tokens, string RefreshToken)> IssueTokensAsync(AdminUser user, CancellationToken cancellationToken)
    {
        var accessToken = jwtTokenService.GenerateAccessToken(user, out var expiresAt);
        var (refresh, _) = await refreshTokenService.CreateAsync(user, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString(), cancellationToken);
        using var settings = JsonDocument.Parse(string.IsNullOrWhiteSpace(user.SettingsJson) ? "{}" : user.SettingsJson);
        var current = new CurrentUserDto(user.Id, user.Login, user.DisplayName, user.Role.ToString(), settings.RootElement.Clone(),
            user.CustomerTelegramId ?? user.TelegramId, user.TelegramUsername, user.TelegramAvatarUrl);
        return (new AuthResultDto(new AuthTokensDto(accessToken, expiresAt, current), refresh), refresh);
    }

    private async Task<Guid> EnsureCustomerAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await db.AdminUsers.Include(item => item.Customer).SingleAsync(item => item.Id == userId, cancellationToken);
        if (user.CustomerId is { } id) return id;
        var now = DateTimeOffset.UtcNow;
        var customer = new Customer { Id = Guid.NewGuid(), Email = user.Email, FirstName = user.DisplayName, CreatedAt = now, UpdatedAt = now };
        db.Customers.Add(customer); user.CustomerId = customer.Id;
        await db.SaveChangesAsync(cancellationToken);
        return customer.Id;
    }

    private async Task<bool> EmailAlreadyUsedAsync(string email, CancellationToken cancellationToken, Guid? exceptUserId = null) =>
        await db.AdminUsers.AnyAsync(user => user.Id != exceptUserId && user.IsActive && user.Email != null && user.Email.ToLower() == email, cancellationToken);

    private async Task<string?> CheckOtpThrottleAsync(string email, string purpose, CancellationToken cancellationToken)
    {
        var last = await db.CustomerEmailOtps.Where(item => item.Email == email && item.Purpose == purpose)
            .OrderByDescending(item => item.CreatedAt).Select(item => (DateTimeOffset?)item.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        return last is not null && DateTimeOffset.UtcNow - last.Value < TimeSpan.FromMinutes(1)
            ? "Подождите минуту перед повторной отправкой кода." : null;
    }

    private async Task<bool> CreateOtpAsync(string email, string purpose, string? passwordHash, string? displayName, Guid? userId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var previous in await db.CustomerEmailOtps.Where(item => item.Email == email && item.Purpose == purpose && item.ConsumedAt == null).ToListAsync(cancellationToken))
            previous.ConsumedAt = now;
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var otp = new CustomerEmailOtp
        {
            Id = Guid.NewGuid(), Email = email, Purpose = purpose, CodeHash = HashOtp(email, purpose, code),
            PasswordHash = passwordHash, DisplayName = displayName, UserId = userId,
            CreatedAt = now, ExpiresAt = now.AddMinutes(OtpLifetimeMinutes),
        };
        db.CustomerEmailOtps.Add(otp);
        await db.SaveChangesAsync(cancellationToken);
        var subject = purpose switch { "register" => "Подтверждение регистрации The Get", "reset" => "Сброс пароля The Get", _ => "Подтверждение email The Get" };
        var html = $"<div style='font-family:Arial,sans-serif'><h2>{subject}</h2><p>Ваш одноразовый код:</p><p style='font-size:28px;font-weight:700;letter-spacing:6px'>{code}</p><p>Код действует 10 минут. Никому не сообщайте его.</p></div>";
        var text = $"{subject}\n\nВаш код: {code}\nКод действует 10 минут. Никому не сообщайте его.";
        try
        {
            await emailSender.SendAsync(email, subject, html, text, cancellationToken);
            return true;
        }
        catch (Exception exception)
        {
            otp.ConsumedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            logger.LogError(exception, "Could not send customer account email OTP");
            return false;
        }
    }

    private async Task<CustomerEmailOtp?> FindOtpAsync(string email, string purpose, CancellationToken cancellationToken) =>
        await db.CustomerEmailOtps.Where(item => item.Email == email && item.Purpose == purpose && item.ConsumedAt == null)
            .OrderByDescending(item => item.CreatedAt).FirstOrDefaultAsync(cancellationToken);

    private async Task<bool> VerifyOtpAsync(CustomerEmailOtp? challenge, string code, string email, string purpose, CancellationToken cancellationToken)
    {
        if (challenge is null || challenge.ExpiresAt <= DateTimeOffset.UtcNow || challenge.FailedAttempts >= OtpMaxAttempts) return false;
        var expected = HashOtp(email, purpose, code.Trim());
        if (CryptographicOperations.FixedTimeEquals(Convert.FromHexString(expected), Convert.FromHexString(challenge.CodeHash))) return true;
        challenge.FailedAttempts++;
        if (challenge.FailedAttempts >= OtpMaxAttempts) challenge.ConsumedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return false;
    }

    private string HashOtp(string email, string purpose, string code)
    {
        var secret = Encoding.UTF8.GetBytes(jwtSettings.Value.Secret);
        var bytes = Encoding.UTF8.GetBytes($"{purpose}:{email}:{code}");
        return Convert.ToHexString(HMACSHA256.HashData(secret, bytes));
    }

    private async Task<bool> IsClaimTokenValidAsync(string? token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token)) return true;
        if (token.Length > 128) return false;
        return await db.CustomerOrderClaims.AnyAsync(claim => claim.TokenHash == Hash(token) && claim.ClaimedAt == null && claim.ExpiresAt > DateTimeOffset.UtcNow, cancellationToken);
    }

    private bool TryGetBuyerId(out Guid userId)
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(raw, out userId) && string.Equals(User.FindFirstValue(ClaimTypes.Role), AdminRole.Buyer.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private void SetRefreshCookie(string token) => AuthCookieHelper.SetRefreshTokenCookie(Response, environment, token, DateTimeOffset.UtcNow.AddDays(jwtSettings.Value.RefreshExpiryDays));

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
    private static bool IsValidEmail(string email) => MailAddress.TryCreate(email, out var address) && address.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? NormalizeName(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? NormalizeTelegramUsername(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim().TrimStart('@');
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static string RandomToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
    private static string Escape(string value) => WebUtility.HtmlEncode(value);
    private static CustomerAccountAddressDto ToAddressDto(CustomerAddress value) => new(value.Id, value.City, value.Street, value.Building, value.Apartment, value.PostalCode, value.Note);
}

public sealed record RegisterEmailRequest(string Email, string Password, string? Name);
public sealed record EmailLoginRequest(string Email, string Password);
public sealed record EmailRequest(string Email);
public sealed record VerifyEmailCodeRequest(string Email, string Code, string? ClaimToken = null);
public sealed record ClaimOrderRequest(string Token);
public sealed record CompletePasswordResetRequest(string Email, string Code, string NewPassword);
public sealed record CompleteTelegramLoginRequest(string State, string Code, string? ClaimToken = null);
public sealed record TelegramAuthorizationStartDto(string AuthorizationUrl);
public sealed record TelegramLinkStatusDto(bool LoginConfigured, bool Linked, string? Username, bool NotificationsEnabled, bool DisabledByAdmin);
public sealed record CustomerAccountProfileDto(Guid Id, string? Email, bool EmailVerified, string? Name, string? Phone, string? ContactTelegram, string? WhatsApp, string? Vk, bool TelegramLinked, bool NotificationsEnabled, bool NotificationsDisabledByAdmin);
public sealed record UpdateCustomerAccountRequest(string? Name, string? Phone, string? Telegram, string? WhatsApp, string? Vk);
public sealed record UpdateCustomerNotificationsRequest(bool Enabled);
public sealed record CustomerAccountAddressDto(Guid Id, string? City, string? Street, string? Building, string? Apartment, string? PostalCode, string? Note);
public sealed record CustomerAddressRequest(string? City, string? Street, string? Building, string? Apartment, string? PostalCode, string? Note);
public sealed record CustomerOrderDto(Guid Id, string TrackingCode, OrderStatus Status, DateTimeOffset CreatedAt, IReadOnlyList<CustomerOrderItemDto> Items);
public sealed record CustomerOrderItemDto(string Name, string? Description, int Quantity, string? ImageUrl);
