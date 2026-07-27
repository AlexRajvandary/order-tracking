using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Infrastructure.TelegramBot;
using Telegram.Bot.Types;

namespace OrderTracking.Api.Controllers;

[ApiController]
[Route("api/bot")]
public sealed class TelegramBotController : ControllerBase
{
    private readonly TelegramAdminBotService _botService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TelegramBotController> _logger;
    private readonly TelegramWorkQueue _workQueue;

    public TelegramBotController(
        TelegramAdminBotService botService,
        TelegramWorkQueue workQueue,
        IConfiguration configuration,
        ILogger<TelegramBotController> logger)
    {
        _botService = botService;
        _workQueue = workQueue;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        if (!_botService.IsEnabled)
        {
            return NotFound();
        }

        var expectedSecret = _configuration["Telegram:WebhookSecret"];
        if (!string.IsNullOrWhiteSpace(expectedSecret))
        {
            var header = Request.Headers["X-Telegram-Bot-Api-Secret-Token"].ToString();
            if (!string.Equals(header, expectedSecret, StringComparison.Ordinal))
            {
                _logger.LogWarning("Rejected Telegram webhook: invalid secret token");
                return Unauthorized();
            }
        }

        Update? update;
        try
        {
            update = await HttpContext.Request.ReadFromJsonAsync<Update>(cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invalid Telegram webhook payload");
            return BadRequest();
        }

        if (update is null)
        {
            return BadRequest();
        }

        _workQueue.EnqueueUpdate(update);
        return Ok();
    }
}
