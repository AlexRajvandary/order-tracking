using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types.Enums;

namespace OrderTracking.Infrastructure.TelegramBot;

public sealed class TelegramBotHostedService : BackgroundService
{
    private readonly TelegramAdminBotService _botService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TelegramBotHostedService> _logger;
    private readonly TelegramWorkQueue _workQueue;

    public TelegramBotHostedService(
        IConfiguration configuration,
        TelegramAdminBotService botService,
        TelegramWorkQueue workQueue,
        ILogger<TelegramBotHostedService> logger)
    {
        _configuration = configuration;
        _botService = botService;
        _workQueue = workQueue;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var bot = _botService.Client;
        if (bot is null || !_botService.IsEnabled)
        {
            _logger.LogInformation("Telegram admin bot is disabled (token not configured)");
            return;
        }

        var usePolling = _configuration.GetValue("Telegram:UsePolling", false);
        var baseUrl = (_configuration["App:BaseUrl"] ?? string.Empty).TrimEnd('/');
        var secret = _configuration["Telegram:WebhookSecret"];

        if (!usePolling && !string.IsNullOrWhiteSpace(baseUrl) && baseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            var webhookUrl = $"{baseUrl}/api/bot/webhook";
            try
            {
                await bot.SetWebhook(
                    webhookUrl,
                    secretToken: string.IsNullOrWhiteSpace(secret) ? null : secret,
                    allowedUpdates: [UpdateType.Message, UpdateType.CallbackQuery],
                    cancellationToken: stoppingToken);
                _logger.LogInformation("Telegram webhook set to {Url}", webhookUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to set Telegram webhook, falling back to polling");
                usePolling = true;
            }
        }
        else
        {
            usePolling = true;
        }

        var workerTask = ProcessWorkQueueAsync(stoppingToken);
        if (usePolling)
        {
            await bot.DeleteWebhook(cancellationToken: stoppingToken);
            _logger.LogInformation("Telegram bot started in long-polling mode");
            var pollingTask = RunPollingAsync(bot, stoppingToken);
            await Task.WhenAll(workerTask, pollingTask);
            return;
        }

        _logger.LogInformation("Telegram bot work queue started (webhook mode)");
        await workerTask;
    }

    private async Task ProcessWorkQueueAsync(CancellationToken stoppingToken)
    {
        await foreach (var item in _workQueue.ReadAllAsync(stoppingToken))
        {
            try
            {
                await _botService.ProcessWorkItemAsync(item, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Telegram work item failed: {ItemType}", item.GetType().Name);
            }
        }
    }

    private async Task RunPollingAsync(ITelegramBotClient bot, CancellationToken stoppingToken)
    {
        var receiverOptions = new ReceiverOptions
        {
            AllowedUpdates = [UpdateType.Message, UpdateType.CallbackQuery],
            DropPendingUpdates = true,
        };

        await bot.ReceiveAsync(
            (_, update, _) =>
            {
                _workQueue.EnqueueUpdate(update);
                return Task.CompletedTask;
            },
            (_, ex, _) =>
            {
                _logger.LogError(ex, "Telegram polling error");
                return Task.CompletedTask;
            },
            receiverOptions,
            stoppingToken);
    }
}
