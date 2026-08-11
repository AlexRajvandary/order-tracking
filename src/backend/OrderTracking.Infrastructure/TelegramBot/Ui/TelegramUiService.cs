using Microsoft.Extensions.Logging;
using Telegram.Bot;
using Telegram.Bot.Exceptions;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot.Ui;

/// <summary>
/// Single-message navigation: EditMessageText when MessageId is known, SendMessage otherwise.
/// Event notifications must not use this helper.
/// </summary>
internal sealed class TelegramUiService
{
    private const int MaxMessageLength = 4096;
    private readonly ILogger<TelegramUiService> _logger;
    private readonly TelegramBotRuntime _runtime;

    public TelegramUiService(TelegramBotRuntime runtime, ILogger<TelegramUiService> logger)
    {
        _runtime = runtime;
        _logger = logger;
    }

    public async Task RenderAsync(
        long chatId,
        int? messageId,
        string text,
        InlineKeyboardMarkup? replyMarkup,
        CancellationToken cancellationToken)
    {
        var bot = _runtime.RequireClient();
        text = TruncateForTelegram(text);

        if (messageId is int editId)
        {
            try
            {
                await bot.EditMessageText(
                    chatId,
                    editId,
                    text,
                    ParseMode.Html,
                    replyMarkup: replyMarkup,
                    cancellationToken: cancellationToken);
                return;
            }
            catch (ApiRequestException ex) when (IsMessageNotModified(ex))
            {
                _logger.LogDebug(
                    "Telegram UI not modified chat={ChatId} message={MessageId}",
                    chatId,
                    editId);
                return;
            }
            catch (ApiRequestException ex) when (IsMessageUneditable(ex))
            {
                _logger.LogWarning(
                    ex,
                    "Telegram UI edit fallback to send chat={ChatId} message={MessageId}",
                    chatId,
                    editId);
            }
            catch (ApiRequestException ex)
            {
                _logger.LogError(
                    ex,
                    "Telegram UI edit failed chat={ChatId} message={MessageId} code={Code}",
                    chatId,
                    editId,
                    ex.ErrorCode);
                throw;
            }
        }

        await bot.SendMessage(
            chatId,
            text,
            ParseMode.Html,
            replyMarkup: replyMarkup,
            cancellationToken: cancellationToken);
    }

    public static string TruncateForTelegram(string text)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= MaxMessageLength)
        {
            return text;
        }

        const string suffix = "\n\n… (обрезано)";
        var keep = MaxMessageLength - suffix.Length;
        return text[..keep] + suffix;
    }

    private static bool IsMessageNotModified(ApiRequestException ex) =>
        ex.Message.Contains("message is not modified", StringComparison.OrdinalIgnoreCase);

    private static bool IsMessageUneditable(ApiRequestException ex)
    {
        var message = ex.Message;
        return message.Contains("message to edit not found", StringComparison.OrdinalIgnoreCase)
            || message.Contains("message can't be edited", StringComparison.OrdinalIgnoreCase)
            || message.Contains("message is not found", StringComparison.OrdinalIgnoreCase)
            || message.Contains("there is no text in the message to edit", StringComparison.OrdinalIgnoreCase)
            || (ex.ErrorCode == 400 && message.Contains("message", StringComparison.OrdinalIgnoreCase)
                && message.Contains("edit", StringComparison.OrdinalIgnoreCase)
                && !message.Contains("message is not modified", StringComparison.OrdinalIgnoreCase));
    }
}
