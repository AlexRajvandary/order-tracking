using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Domain.Enums;
using OrderTracking.Infrastructure.Identity;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using Telegram.Bot.Types.ReplyMarkups;

namespace OrderTracking.Infrastructure.TelegramBot;

public sealed class TelegramAdminBotService
{
    public const int PageSize = 10;

    private readonly ITelegramBotClient? _bot;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TelegramAdminBotService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TelegramSettings _settings;
    private readonly TelegramWorkQueue _workQueue;

    public ITelegramBotClient? Client => _bot;

    public bool IsEnabled =>
        _bot is not null
        && !string.IsNullOrWhiteSpace(_settings.BotToken);

    public TelegramAdminBotService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        IOptions<TelegramSettings> settings,
        TelegramWorkQueue workQueue,
        ILogger<TelegramAdminBotService> logger,
        ITelegramBotClient? bot = null)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _settings = settings.Value;
        _workQueue = workQueue;
        _logger = logger;
        _bot = bot;
    }

    public async Task HandleUpdateAsync(Update update, CancellationToken cancellationToken)
    {
        if (!IsEnabled || _bot is null)
        {
            return;
        }

        try
        {
            if (update.CallbackQuery is { } callback)
            {
                await HandleCallbackAsync(callback, cancellationToken);
                return;
            }

            if (update.Message is { Text: { } text } message)
            {
                await HandleMessageAsync(message, text.Trim(), cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to handle Telegram update {UpdateId}", update.Id);
        }
    }

    public async Task SendDailyOrdersCsvToAdminAsync(
        long telegramId,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || _bot is null)
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var orders = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        var csv = await BuildOrdersCsvAsync(orders, cancellationToken);
        await using var stream = new MemoryStream(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray());
        var fileName = $"orders-{DateTime.UtcNow:yyyyMMdd}.csv";

        await _bot.SendDocument(
            telegramId,
            InputFile.FromStream(stream, fileName),
            caption: $"Ежедневный отчёт по заказам ({DateTime.UtcNow:yyyy-MM-dd} UTC)",
            cancellationToken: cancellationToken);
    }

    internal async Task<IReadOnlyList<(Guid AdminId, long TelegramId, string SettingsJson)>> GetDailyCsvRecipientsAsync(
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var admins = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .ListActiveWithTelegramAsync(cancellationToken);

        var result = new List<(Guid, long, string)>();
        foreach (var admin in admins)
        {
            var settings = TelegramBotUserSettings.FromJson(admin.SettingsJson);
            if (!settings.DailyOrdersCsvEnabled)
            {
                continue;
            }

            if (utcNow.Hour != settings.DailyOrdersCsvHourUtc)
            {
                continue;
            }

            result.Add((admin.Id, admin.TelegramId!.Value, admin.SettingsJson));
        }

        return result;
    }

    internal async Task ProcessWorkItemAsync(TelegramWorkItem item, CancellationToken cancellationToken)
    {
        if (item is TelegramUpdateWorkItem update)
        {
            await HandleUpdateAsync(update.Update, cancellationToken);
        }
    }

    private static async Task<string> BuildOrdersCsvAsync(IOrderRepository orders, CancellationToken cancellationToken)
    {
        var rows = await orders.GetAllForTelegramCsvAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("TrackingCode,Status,CreatedAtUtc,UpdatedAtUtc,CustomerName,Phone,Telegram,Email,ItemsCount,AdminNotes");
        foreach (var o in rows)
        {
            sb.Append(Csv(o.TrackingCode)).Append(',');
            sb.Append(Csv(o.Status)).Append(',');
            sb.Append(Csv(o.CreatedAt.ToString("o"))).Append(',');
            sb.Append(Csv(o.UpdatedAt.ToString("o"))).Append(',');
            sb.Append(Csv(o.CustomerName)).Append(',');
            sb.Append(Csv(o.CustomerPhone)).Append(',');
            sb.Append(Csv(o.CustomerTelegram)).Append(',');
            sb.Append(Csv(o.CustomerEmail)).Append(',');
            sb.Append(o.ItemsCount).Append(',');
            sb.Append(Csv(o.AdminNotes));
            sb.AppendLine();
        }

        return sb.ToString();
    }

    private static InlineKeyboardButton[] BuildPagerRow(string prefix, int page, int totalPages)
    {
        var prev = page > 1
            ? InlineKeyboardButton.WithCallbackData("‹", prefix + (page - 1))
            : InlineKeyboardButton.WithCallbackData("·", TelegramBotCallback.Noop);
        var next = page < totalPages
            ? InlineKeyboardButton.WithCallbackData("›", prefix + (page + 1))
            : InlineKeyboardButton.WithCallbackData("·", TelegramBotCallback.Noop);
        var current = InlineKeyboardButton.WithCallbackData($"стр. {page}/{totalPages}", TelegramBotCallback.Noop);
        return [prev, current, next];
    }

    private static string Csv(string? value)
    {
        value ??= string.Empty;
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n') || value.Contains('\r'))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }

        return value;
    }
    private async Task<IReadOnlyList<long>> GetRecipientTelegramIdsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var admins = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .ListActiveWithTelegramAsync(cancellationToken);
        return admins
            .Select(a => a.TelegramId!.Value)
            .Distinct()
            .ToList();
    }

    private async Task HandleCallbackAsync(CallbackQuery callback, CancellationToken cancellationToken)
    {
        var chatId = callback.Message?.Chat.Id;
        if (chatId is null || callback.From is null)
        {
            return;
        }

        var admin = await ResolveAdminAsync(callback.From.Id, cancellationToken);
        if (admin is null)
        {
            await _bot!.AnswerCallbackQuery(callback.Id, "Нет доступа", cancellationToken: cancellationToken);
            await _bot!.SendMessage(
                chatId.Value,
                "Доступ запрещён. Привяжите Telegram в админке.",
                cancellationToken: cancellationToken);
            return;
        }

        var data = callback.Data ?? string.Empty;

        try
        {
            if (data == TelegramBotCallback.Main || data == TelegramBotCallback.Noop)
            {
                if (data == TelegramBotCallback.Main)
                {
                    await SendMainMenuAsync(chatId.Value, admin, cancellationToken);
                }

                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            if (data == TelegramBotCallback.AdminLink)
            {
                await SendAdminLinkAsync(chatId.Value, cancellationToken);
                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            if (data == TelegramBotCallback.Settings
                || data is TelegramBotCallback.SettingsCsvOn or TelegramBotCallback.SettingsCsvOff)
            {
                await HandleSettingsAsync(chatId.Value, admin, data, cancellationToken);
                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrdersPagePrefix, StringComparison.Ordinal))
            {
                var page = int.TryParse(data[TelegramBotCallback.OrdersPagePrefix.Length..], out var p) ? p : 1;
                await SendOrdersPageAsync(chatId.Value, page, cancellationToken);
                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.OrderOpenPrefix, StringComparison.Ordinal))
            {
                var id = TelegramBotCallback.DecodeGuid(data[TelegramBotCallback.OrderOpenPrefix.Length..]);
                if (id is null)
                {
                    await _bot!.AnswerCallbackQuery(callback.Id, "Некорректный заказ", cancellationToken: cancellationToken);
                    return;
                }

                await SendOrderCardAsync(chatId.Value, id.Value, cancellationToken);
                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.CustomersPagePrefix, StringComparison.Ordinal))
            {
                var page = int.TryParse(data[TelegramBotCallback.CustomersPagePrefix.Length..], out var p) ? p : 1;
                await SendCustomersPageAsync(chatId.Value, page, cancellationToken);
                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.CustomerOpenPrefix, StringComparison.Ordinal))
            {
                var id = TelegramBotCallback.DecodeGuid(data[TelegramBotCallback.CustomerOpenPrefix.Length..]);
                if (id is null)
                {
                    await _bot!.AnswerCallbackQuery(callback.Id, "Некорректный клиент", cancellationToken: cancellationToken);
                    return;
                }

                await SendCustomerCardAsync(chatId.Value, id.Value, cancellationToken);
                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            if (data.StartsWith(TelegramBotCallback.AdminsPagePrefix, StringComparison.Ordinal))
            {
                if (admin.Role is not (AdminRole.Admin or AdminRole.SuperAdmin))
                {
                    await _bot!.AnswerCallbackQuery(callback.Id, "Недостаточно прав", showAlert: true, cancellationToken: cancellationToken);
                    return;
                }

                var page = int.TryParse(data[TelegramBotCallback.AdminsPagePrefix.Length..], out var p) ? p : 1;
                await SendAdminsPageAsync(chatId.Value, page, cancellationToken);
                await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
                return;
            }

            await _bot!.AnswerCallbackQuery(callback.Id, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Callback handling failed: {Data}", data);
            try
            {
                await _bot!.AnswerCallbackQuery(callback.Id, "Ошибка", showAlert: true, cancellationToken: cancellationToken);
            }
            catch
            {
                // ignore
            }
        }
    }

    private async Task HandleMessageAsync(Message message, string text, CancellationToken cancellationToken)
    {
        var admin = await ResolveAdminAsync(message.From?.Id, cancellationToken);
        if (admin is null)
        {
            await _bot!.SendMessage(
                message.Chat.Id,
                "Доступ запрещён. Привяжите Telegram-аккаунт к активному админу в веб-админке.",
                cancellationToken: cancellationToken);
            return;
        }

        if (text.StartsWith("/start", StringComparison.OrdinalIgnoreCase)
            || text.StartsWith("/menu", StringComparison.OrdinalIgnoreCase)
            || text.Equals("меню", StringComparison.OrdinalIgnoreCase))
        {
            await SendMainMenuAsync(message.Chat.Id, admin, cancellationToken);
            return;
        }

        await SendMainMenuAsync(message.Chat.Id, admin, cancellationToken);
    }

    private async Task HandleSettingsAsync(
        long chatId,
        TelegramBotAdminContext admin,
        string data,
        CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var admins = scope.ServiceProvider.GetRequiredService<IAdminUserRepository>();
        var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var user = await admins.GetByIdTrackedAsync(admin.AdminId, cancellationToken);
        if (user is null)
        {
            return;
        }
        var settings = TelegramBotUserSettings.FromJson(user.SettingsJson);

        if (data == TelegramBotCallback.SettingsCsvOn)
        {
            settings.DailyOrdersCsvEnabled = true;
            user.SettingsJson = TelegramBotUserSettings.MergeInto(user.SettingsJson, settings);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        else if (data == TelegramBotCallback.SettingsCsvOff)
        {
            settings.DailyOrdersCsvEnabled = false;
            user.SettingsJson = TelegramBotUserSettings.MergeInto(user.SettingsJson, settings);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        settings = TelegramBotUserSettings.FromJson(user.SettingsJson);
        var status = settings.DailyOrdersCsvEnabled
            ? $"включена (каждый день в {settings.DailyOrdersCsvHourUtc:00}:00 UTC)"
            : "выключена";

        var keyboard = new InlineKeyboardMarkup(
        [
            [
                settings.DailyOrdersCsvEnabled
                    ? InlineKeyboardButton.WithCallbackData("Выключить ежедневный CSV", TelegramBotCallback.SettingsCsvOff)
                    : InlineKeyboardButton.WithCallbackData("Включить ежедневный CSV", TelegramBotCallback.SettingsCsvOn)
            ],
            [InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)],
        ]);

        await _bot!.SendMessage(
            chatId,
            $"⚙️ Настройки бота\nЕжедневная CSV-выгрузка всех заказов: <b>{status}</b>",
            ParseMode.Html,
            replyMarkup: keyboard,
            cancellationToken: cancellationToken);
    }

    private async Task<TelegramBotAdminContext?> ResolveAdminAsync(long? telegramId, CancellationToken cancellationToken)
    {
        if (telegramId is null)
        {
            return null;
        }

        using var scope = _scopeFactory.CreateScope();
        var admin = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .GetActiveByTelegramIdAsync(telegramId.Value, cancellationToken);

        if (admin is null)
        {
            return null;
        }

        return new TelegramBotAdminContext(
            admin.Id,
            admin.TelegramId!.Value,
            admin.Login,
            admin.DisplayName,
            admin.Role,
            admin.IsActive);
    }

    private async Task SendAdminLinkAsync(long chatId, CancellationToken cancellationToken)
    {
        var baseUrl = (_configuration["App:BaseUrl"] ?? "http://localhost:8080").TrimEnd('/');
        var url = $"{baseUrl}/admin/login";
        await _bot!.SendMessage(
            chatId,
            $"Ссылка для входа в админку (можно скопировать):\n\n<code>{TelegramBotText.Escape(url)}</code>",
            ParseMode.Html,
            cancellationToken: cancellationToken);
    }

    private async Task SendAdminsPageAsync(long chatId, int page, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var admins = await scope.ServiceProvider
            .GetRequiredService<IAdminUserRepository>()
            .ListOrderedByLoginAsync(cancellationToken);

        page = Math.Max(1, page);
        var total = admins.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)PageSize));
        page = Math.Min(page, totalPages);

        var items = admins
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .ToList();

        var buttons = new List<InlineKeyboardButton[]>
        {
            BuildPagerRow(TelegramBotCallback.AdminsPagePrefix, page, totalPages),
            new[] { InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main) },
        };

        var lines = items.Select((a, idx) =>
        {
            var tg = a.TelegramUsername is null ? "нет TG" : "@" + a.TelegramUsername;
            var active = a.IsActive ? "on" : "off";
            return $"{(page - 1) * PageSize + idx + 1}. <code>{TelegramBotText.Escape(a.Login)}</code> ({TelegramBotText.RoleLabel(a.Role)}, {active}, {TelegramBotText.Escape(tg)})";
        });

        await _bot!.SendMessage(
            chatId,
            $"🛡 Админы (стр. {page}/{totalPages}, всего {total})\n\n{string.Join('\n', lines)}",
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(buttons),
            cancellationToken: cancellationToken);
    }

    private async Task SendCustomerCardAsync(long chatId, Guid customerId, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var customers = scope.ServiceProvider.GetRequiredService<ICustomerRepository>();
        var c = await customers.GetByIdUntrackedAsync(customerId, cancellationToken);
        if (c is null)
        {
            await _bot!.SendMessage(chatId, "Клиент не найден", cancellationToken: cancellationToken);
            return;
        }

        var name = $"{c.LastName} {c.FirstName} {c.Patronymic}".Trim();
        var text =
            $"👤 <b>{TelegramBotText.Escape(name)}</b>\n" +
            $"Телефон: {TelegramBotText.Escape(c.Phone)}\n" +
            $"Email: {TelegramBotText.Escape(c.Email)}\n" +
            $"Telegram: {TelegramBotText.Escape(c.Telegram)}\n" +
            $"Заказов: {c.OrdersCount}\n" +
            $"Создан: {c.CreatedAt:yyyy-MM-dd HH:mm} UTC";

        await _bot!.SendMessage(
            chatId,
            text,
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(
                InlineKeyboardButton.WithCallbackData("« К клиентам", TelegramBotCallback.CustomersPagePrefix + "1"),
                InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)),
            cancellationToken: cancellationToken);
    }

    private async Task SendCustomersPageAsync(long chatId, int page, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var customers = scope.ServiceProvider.GetRequiredService<ICustomerRepository>();

        page = Math.Max(1, page);
        var customersPage = await customers.GetPagedAsync(page, PageSize, cancellationToken);
        var total = customersPage.TotalCount;
        var totalPages = Math.Max(1, customersPage.TotalPages);
        page = Math.Min(page, totalPages);
        if (page != customersPage.Page)
        {
            customersPage = await customers.GetPagedAsync(page, PageSize, cancellationToken);
        }

        var items = customersPage.Items
            .Select(c => new { c.Id, Name = ((c.LastName ?? "") + " " + (c.FirstName ?? "")).Trim(), c.Phone })
            .ToList();

        var buttons = new List<InlineKeyboardButton[]>();
        for (var i = 0; i < items.Count; i += 5)
        {
            var row = items.Skip(i).Take(5)
                .Select(c => InlineKeyboardButton.WithCallbackData(
                    TelegramBotText.Truncate(string.IsNullOrWhiteSpace(c.Name) ? c.Id.ToString("N")[..8] : c.Name, 14),
                    TelegramBotCallback.CustomerOpenPrefix + TelegramBotCallback.EncodeGuid(c.Id)))
                .ToArray();
            buttons.Add(row);
        }

        buttons.Add(BuildPagerRow(TelegramBotCallback.CustomersPagePrefix, page, totalPages));
        buttons.Add([InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)]);

        var lines = items.Select((c, idx) =>
            $"{(page - 1) * PageSize + idx + 1}. {TelegramBotText.Escape(c.Name)} — {TelegramBotText.Escape(c.Phone)}");

        await _bot!.SendMessage(
            chatId,
            $"👤 Клиенты (стр. {page}/{totalPages}, всего {total})\n\n{string.Join('\n', lines)}",
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(buttons),
            cancellationToken: cancellationToken);
    }

    private async Task SendMainMenuAsync(long chatId, TelegramBotAdminContext admin, CancellationToken cancellationToken)
    {
        var rows = new List<InlineKeyboardButton[]>
        {
            new[] { InlineKeyboardButton.WithCallbackData("📦 Заказы", TelegramBotCallback.OrdersPagePrefix + "1") },
            new[] { InlineKeyboardButton.WithCallbackData("👤 Клиенты", TelegramBotCallback.CustomersPagePrefix + "1") },
        };

        if (admin.Role is AdminRole.Admin or AdminRole.SuperAdmin)
        {
            rows.Add([InlineKeyboardButton.WithCallbackData("🛡 Админы", TelegramBotCallback.AdminsPagePrefix + "1")]);
        }

        rows.Add([InlineKeyboardButton.WithCallbackData("🔗 Актуальная ссылка в админку", TelegramBotCallback.AdminLink)]);
        rows.Add([InlineKeyboardButton.WithCallbackData("⚙️ Настройки CSV", TelegramBotCallback.Settings)]);

        var name = string.IsNullOrWhiteSpace(admin.DisplayName) ? admin.Login : admin.DisplayName;
        var text =
            $"Здравствуйте, <b>{TelegramBotText.Escape(name)}</b>\n" +
            $"Роль: <code>{TelegramBotText.RoleLabel(admin.Role)}</code>\n\n" +
            "Выберите раздел (только просмотр):";

        await _bot!.SendMessage(
            chatId,
            text,
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(rows),
            cancellationToken: cancellationToken);
    }

    private async Task SendOrderCardAsync(long chatId, Guid orderId, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IObjectStorage>();
        var order = await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .GetByIdWithPublishedStatusHistoryAsync(orderId, cancellationToken);

        if (order is null)
        {
            await _bot!.SendMessage(chatId, "Заказ не найден", cancellationToken: cancellationToken);
            return;
        }

        var customerName = order.Customer is null
            ? null
            : $"{order.Customer.LastName} {order.Customer.FirstName} {order.Customer.Patronymic}".Trim();

        var header =
            $"📦 Заказ <code>{TelegramBotText.Escape(order.TrackingCode)}</code>\n" +
            $"Статус: <b>{TelegramBotText.Escape(order.Status.ToString())}</b>\n" +
            $"Клиент: {TelegramBotText.Escape(customerName)}\n" +
            $"Тел: {TelegramBotText.Escape(order.Customer?.Phone)}\n" +
            $"TG: {TelegramBotText.Escape(order.Customer?.Telegram)}\n" +
            $"Создан: {order.CreatedAt:yyyy-MM-dd HH:mm} UTC\n" +
            $"Позиций: {order.Items.Count}";

        await _bot!.SendMessage(
            chatId,
            header,
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(
                InlineKeyboardButton.WithCallbackData("« К заказам", TelegramBotCallback.OrdersPagePrefix + "1"),
                InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)),
            cancellationToken: cancellationToken);

        var history = order.Items
            .SelectMany(i => i.StatusHistory)
            .OrderBy(h => h.ChangedAt)
            .ThenBy(h => h.Id)
            .ToList();

        if (history.Count == 0)
        {
            await _bot!.SendMessage(chatId, "Опубликованных статусов пока нет.", cancellationToken: cancellationToken);
            return;
        }

        foreach (var h in history)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"📍 <b>{TelegramBotText.Escape(h.StatusText)}</b>");
            sb.AppendLine($"Позиция: {TelegramBotText.Escape(h.OrderItem.Name)}");
            sb.AppendLine($"Когда: {h.ChangedAt:yyyy-MM-dd HH:mm} UTC");
            if (!string.IsNullOrWhiteSpace(h.Country) || !string.IsNullOrWhiteSpace(h.Location))
            {
                sb.AppendLine($"Где: {TelegramBotText.Escape(string.Join(", ", new[] { h.Country, h.Location }.Where(x => !string.IsNullOrWhiteSpace(x))))}");
            }

            if (!string.IsNullOrWhiteSpace(h.Comment))
            {
                sb.AppendLine($"Комментарий: {TelegramBotText.Escape(h.Comment)}");
            }

            await _bot!.SendMessage(chatId, sb.ToString(), ParseMode.Html, cancellationToken: cancellationToken);

            var photos = h.Attachments
                .Where(a => a.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                .OrderBy(a => a.SortOrder)
                .ToList();

            foreach (var batch in photos.Chunk(10))
            {
                try
                {
                    if (batch.Length == 1)
                    {
                        var a = batch[0];
                        await using var stream = await storage.GetAsync(a.ObjectKey, cancellationToken);
                        await using var ms = new MemoryStream();
                        await stream.CopyToAsync(ms, cancellationToken);
                        ms.Position = 0;
                        await _bot!.SendPhoto(
                            chatId,
                            InputFile.FromStream(ms, a.OriginalFileName ?? "photo.jpg"),
                            caption: $"Фото к статусу «{h.StatusText}»",
                            cancellationToken: cancellationToken);
                        continue;
                    }

                    var album = new List<IAlbumInputMedia>();
                    var streams = new List<MemoryStream>();
                    try
                    {
                        var index = 0;
                        foreach (var a in batch)
                        {
                            await using var stream = await storage.GetAsync(a.ObjectKey, cancellationToken);
                            var ms = new MemoryStream();
                            await stream.CopyToAsync(ms, cancellationToken);
                            ms.Position = 0;
                            streams.Add(ms);
                            var media = new InputMediaPhoto(InputFile.FromStream(ms, a.OriginalFileName ?? $"photo-{index}.jpg"));
                            if (index == 0)
                            {
                                media.Caption = $"Фото к статусу «{h.StatusText}»";
                            }

                            album.Add(media);
                            index++;
                        }

                        await _bot!.SendMediaGroup(chatId, album, cancellationToken: cancellationToken);
                    }
                    finally
                    {
                        foreach (var s in streams)
                        {
                            await s.DisposeAsync();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send status photos for history {HistoryId}", h.Id);
                    await _bot!.SendMessage(
                        chatId,
                        $"⚠ Не удалось отправить фото к статусу «{TelegramBotText.Escape(h.StatusText)}»",
                        ParseMode.Html,
                        cancellationToken: cancellationToken);
                }
            }
        }
    }

    internal async Task SendOrderCreatedNotifyAsync(
        Guid orderId,
        string trackingCode,
        string? customerName,
        CancellationToken cancellationToken)
    {
        if (!IsEnabled || _bot is null)
        {
            return;
        }

        var recipients = await GetRecipientTelegramIdsAsync(cancellationToken);
        if (recipients.Count == 0)
        {
            return;
        }

        var text =
            $"<b>Новый заказ</b>\n" +
            $"Код: <code>{TelegramBotText.Escape(trackingCode)}</code>\n" +
            $"Клиент: {TelegramBotText.Escape(customerName)}\n" +
            $"Id: <code>{orderId}</code>";

        var keyboard = new InlineKeyboardMarkup(
            InlineKeyboardButton.WithCallbackData("Открыть заказ", TelegramBotCallback.OrderOpenPrefix + TelegramBotCallback.EncodeGuid(orderId)));

        foreach (var chatId in recipients)
        {
            try
            {
                await _bot.SendMessage(chatId, text, ParseMode.Html, replyMarkup: keyboard, cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify Telegram chat {ChatId} about new order", chatId);
            }
        }
    }

    private async Task SendOrdersPageAsync(long chatId, int page, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var orders = scope.ServiceProvider.GetRequiredService<IOrderRepository>();

        page = Math.Max(1, page);
        var ordersPage = await orders.GetPagedAsync(page, PageSize, cancellationToken);
        var total = ordersPage.TotalCount;
        var totalPages = Math.Max(1, ordersPage.TotalPages);
        page = Math.Min(page, totalPages);
        if (page != ordersPage.Page)
        {
            ordersPage = await orders.GetPagedAsync(page, PageSize, cancellationToken);
        }

        var items = ordersPage.Items;

        var buttons = new List<InlineKeyboardButton[]>();
        for (var i = 0; i < items.Count; i += 5)
        {
            var row = items.Skip(i).Take(5)
                .Select(o => InlineKeyboardButton.WithCallbackData(
                    TelegramBotText.Truncate(o.TrackingCode, 12),
                    TelegramBotCallback.OrderOpenPrefix + TelegramBotCallback.EncodeGuid(o.Id)))
                .ToArray();
            buttons.Add(row);
        }

        buttons.Add(BuildPagerRow(TelegramBotCallback.OrdersPagePrefix, page, totalPages));
        buttons.Add([InlineKeyboardButton.WithCallbackData("« В меню", TelegramBotCallback.Main)]);

        var lines = items.Select((o, idx) =>
            $"{(page - 1) * PageSize + idx + 1}. <code>{TelegramBotText.Escape(o.TrackingCode)}</code> — {TelegramBotText.Escape(o.CustomerName)}");

        await _bot!.SendMessage(
            chatId,
            $"📦 Заказы (стр. {page}/{totalPages}, всего {total})\n\n{string.Join('\n', lines)}",
            ParseMode.Html,
            replyMarkup: new InlineKeyboardMarkup(buttons),
            cancellationToken: cancellationToken);
    }

    internal async Task SendStatusPublishedNotifyAsync(
        TelegramStatusPublishedWorkItem item,
        CancellationToken cancellationToken)
    {
        if (!IsEnabled || _bot is null)
        {
            return;
        }

        var recipients = await GetRecipientTelegramIdsAsync(cancellationToken);
        if (recipients.Count == 0)
        {
            throw new InvalidOperationException("No active admins with Telegram linked for status notify");
        }

        if (!await TryClaimStatusHistoryNotifyAsync(item.StatusHistoryId, cancellationToken))
        {
            var dedupKey = TelegramOutboxDedupKeys.StatusHistory(item.StatusHistoryId);
            if (await HasSentOutboxAsync(dedupKey, cancellationToken))
            {
                return;
            }

            // Stale claim after crash before Sent — clear and reclaim.
            await ClearStatusHistoryNotifyClaimAsync(item.StatusHistoryId, cancellationToken);
            if (!await TryClaimStatusHistoryNotifyAsync(item.StatusHistoryId, cancellationToken))
            {
                if (await HasSentOutboxAsync(dedupKey, cancellationToken))
                {
                    return;
                }

                throw new InvalidOperationException(
                    "Status notify claim is held without a Sent outbox row; will retry");
            }
        }

        try
        {
            var sb = new StringBuilder();
            sb.AppendLine("📣 <b>Статус опубликован</b>");
            sb.AppendLine($"Заказ: <code>{TelegramBotText.Escape(item.TrackingCode)}</code>");
            if (!string.IsNullOrWhiteSpace(item.OrderItemName))
            {
                sb.AppendLine($"Позиция: {TelegramBotText.Escape(item.OrderItemName)}");
            }

            sb.AppendLine($"Статус: <b>{TelegramBotText.Escape(item.StatusText)}</b>");
            if (!string.IsNullOrWhiteSpace(item.Country) || !string.IsNullOrWhiteSpace(item.Location))
            {
                sb.AppendLine($"Где: {TelegramBotText.Escape(string.Join(", ", new[] { item.Country, item.Location }.Where(x => !string.IsNullOrWhiteSpace(x))))}");
            }

            var keyboard = new InlineKeyboardMarkup(
                InlineKeyboardButton.WithCallbackData(
                    "Открыть заказ",
                    TelegramBotCallback.OrderOpenPrefix + TelegramBotCallback.EncodeGuid(item.OrderId)));

            var delivered = 0;
            foreach (var chatId in recipients)
            {
                try
                {
                    await _bot.SendMessage(chatId, sb.ToString(), ParseMode.Html, replyMarkup: keyboard, cancellationToken: cancellationToken);
                    delivered++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify Telegram chat {ChatId} about status publish", chatId);
                }
            }

            if (delivered == 0)
            {
                throw new InvalidOperationException(
                    $"Telegram status notify delivered to 0 of {recipients.Count} recipients");
            }
        }
        catch
        {
            await ClearStatusHistoryNotifyClaimAsync(item.StatusHistoryId, cancellationToken);
            throw;
        }
    }

    private async Task<bool> HasSentOutboxAsync(string dedupKey, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        return await scope.ServiceProvider
            .GetRequiredService<ITelegramOutboxRepository>()
            .ExistsByDedupKeyAndStatusAsync(dedupKey, TelegramOutboxStatus.Sent, cancellationToken);
    }

    private async Task<bool> TryClaimStatusHistoryNotifyAsync(Guid statusHistoryId, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        return await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .TryClaimTelegramNotifyAsync(statusHistoryId, DateTimeOffset.UtcNow, cancellationToken);
    }

    private async Task ClearStatusHistoryNotifyClaimAsync(Guid statusHistoryId, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        await scope.ServiceProvider
            .GetRequiredService<IOrderRepository>()
            .ClearTelegramNotifyClaimAsync(statusHistoryId, cancellationToken);
    }
}
