using System.Globalization;
using System.Text;
using Microsoft.Extensions.Configuration;
using OrderTracking.Domain.Entities;
using OrderTracking.Domain.Enums;

namespace OrderTracking.Infrastructure.TelegramBot;

internal enum TelegramOrderKind
{
    Standard,
    IndividualRequest,
    Auction,
    Tickets,
}

internal static class TelegramOrderKindMapper
{
    public static TelegramOrderKind GetKind(Order order)
    {
        var source = order.AdminNotes ?? string.Empty;

        if (source.Contains("Аукцион", StringComparison.OrdinalIgnoreCase))
        {
            return TelegramOrderKind.Auction;
        }

        if (source.Contains("Билеты", StringComparison.OrdinalIgnoreCase))
        {
            return TelegramOrderKind.Tickets;
        }

        if (source.Contains("Индивидуальный запрос", StringComparison.OrdinalIgnoreCase))
        {
            return TelegramOrderKind.IndividualRequest;
        }

        return TelegramOrderKind.Standard;
    }
}

internal static class TelegramOrderStatusMapper
{
    public static string Format(OrderStatus status, TelegramOrderKind kind)
    {
        if (status == OrderStatus.AwaitingPayment)
        {
            return kind switch
            {
                TelegramOrderKind.IndividualRequest => "🟠 <b>Требуется обработка</b>",
                TelegramOrderKind.Auction => "🟠 <b>Требуется ставка</b>",
                TelegramOrderKind.Tickets => "🔵 <b>Ищем билеты</b>",
                _ => "🟡 <b>Ожидает оплаты</b>",
            };
        }

        return status.ToString() switch
        {
            nameof(OrderStatus.InProgress) => "🔵 <b>В работе</b>",
            "Paid" => "🟢 <b>Оплачен</b>",
            "Purchased" => "🟣 <b>Выкуплен</b>",
            "Shipped" => "🚚 <b>Отправлен</b>",
            nameof(OrderStatus.Completed) => "✅ <b>Завершён</b>",
            nameof(OrderStatus.Cancelled) => "🔴 <b>Отменён</b>",
            _ => "⚪ <b>Статус обновлён</b>",
        };
    }
}

internal sealed class TelegramOrderMessageFormatter
{
    private static readonly CultureInfo RussianCulture = CultureInfo.GetCultureInfo("ru-RU");

    private readonly TimeZoneInfo _timeZone;

    public TelegramOrderMessageFormatter(IConfiguration configuration)
    {
        _timeZone = ResolveTimeZone(configuration["Telegram:TimeZone"]);
    }

    public string Format(Order order)
    {
        var kind = TelegramOrderKindMapper.GetKind(order);
        var items = order.Items.OrderBy(item => item.SortOrder).ThenBy(item => item.CreatedAt).ToList();
        var text = new StringBuilder();

        text.AppendLine(BuildTitle(order.TrackingCode, kind));
        text.AppendLine();

        switch (kind)
        {
            case TelegramOrderKind.IndividualRequest:
                AppendIndividualRequest(text, items.FirstOrDefault());
                break;
            case TelegramOrderKind.Auction:
                AppendAuction(text, items.FirstOrDefault());
                break;
            case TelegramOrderKind.Tickets:
                AppendTickets(text, items.FirstOrDefault());
                break;
            default:
                AppendStandardOrder(text, items);
                break;
        }

        AppendCustomer(text, order);
        text.AppendLine($"🕐 {FormatLocalTime(order.CreatedAt)}");
        text.AppendLine();
        text.Append(TelegramOrderStatusMapper.Format(order.Status, kind));

        return text.ToString().Trim();
    }

    public string FormatFallback(
        string trackingCode,
        string? customerName,
        string? phone,
        string? telegram,
        string? whatsApp,
        string? vk,
        string? address)
    {
        var text = new StringBuilder();
        text.AppendLine($"📦 <b>НОВЫЙ ЗАКАЗ · #{TelegramBotText.Escape(trackingCode)}</b>");
        text.AppendLine();
        AppendOptional(text, customerName, "👤 ");
        AppendOptional(text, phone, "📞 ");
        AppendOptional(text, NormalizeTelegram(telegram), "💬 ");
        AppendOptional(text, whatsApp, "WhatsApp: ");
        AppendOptional(text, vk, "VK: ");
        AppendOptional(text, address, "📍 ");

        return text.ToString().TrimEnd();
    }

    public string FormatContacts(Order order)
    {
        var text = new StringBuilder();
        text.AppendLine($"<b>Контакты · #{TelegramBotText.Escape(order.TrackingCode)}</b>");
        text.AppendLine();
        AppendCustomer(text, order, includeTimeSeparator: false);

        return text.ToString().TrimEnd();
    }

    public string FormatHistory(Order order)
    {
        var history = order.Items
            .SelectMany(item => item.StatusHistory)
            .OrderBy(entry => entry.ChangedAt)
            .ThenBy(entry => entry.Id)
            .ToList();

        var text = new StringBuilder();
        text.AppendLine($"<b>История · #{TelegramBotText.Escape(order.TrackingCode)}</b>");

        foreach (var entry in history)
        {
            text.AppendLine();
            text.AppendLine($"<b>{TelegramBotText.Escape(entry.StatusText)}</b>");
            text.AppendLine($"{TelegramBotText.Escape(entry.OrderItem.Name)} · {FormatLocalTime(entry.ChangedAt)}");
            AppendOptional(text, entry.Location, "📍 ");
            AppendOptional(text, entry.Comment, string.Empty);
        }

        return text.ToString().TrimEnd();
    }

    private static string BuildTitle(string trackingCode, TelegramOrderKind kind)
    {
        var label = kind switch
        {
            TelegramOrderKind.IndividualRequest => "💬 <b>НОВЫЙ ЗАПРОС",
            TelegramOrderKind.Auction => "🔨 <b>АУКЦИОН",
            TelegramOrderKind.Tickets => "🎫 <b>БИЛЕТЫ",
            _ => "📦 <b>НОВЫЙ ЗАКАЗ",
        };

        return $"{label} · #{TelegramBotText.Escape(trackingCode)}</b>";
    }

    private static void AppendStandardOrder(StringBuilder text, IReadOnlyList<OrderItem> items)
    {
        if (items.Count > 0)
        {
            text.AppendLine($"<b>{TelegramBotText.Escape(items[0].Name)}</b>");
            text.AppendLine(FormatPositionCount(items.Sum(item => item.Quantity)));
        }

        var pricedItems = items.Where(item => item.UnitPrice.HasValue).ToList();
        var currency = pricedItems.Select(item => item.CurrencyCode).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (pricedItems.Count == items.Count && items.Count > 0 && currency.Count == 1)
        {
            var total = pricedItems.Sum(item => item.UnitPrice!.Value * item.Quantity);
            text.AppendLine();
            text.AppendLine($"💰 <b>Итого: {FormatMoney(total, currency[0])}</b>");
        }

        var firstSource = items.Select(item => item.SourceUrl).FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
        AppendLinkOrText(text, firstSource, "Открыть товар");
        text.AppendLine();
    }

    private static void AppendIndividualRequest(StringBuilder text, OrderItem? item)
    {
        text.AppendLine("<b>Запрос клиента</b>");
        AppendOptional(text, item?.Description, string.Empty);
        AppendMoney(text, item?.UnitPrice, item?.CurrencyCode, "Бюджет", "до ");
        AppendLinkOrText(text, item?.SourceUrl, "Открыть пример");
        text.AppendLine();
    }

    private static void AppendAuction(StringBuilder text, OrderItem? item)
    {
        text.AppendLine($"<b>{TelegramBotText.Escape(item?.Name ?? "Аукционный лот")}</b>");
        AppendOptional(text, GetMarketplace(item?.SourceUrl), string.Empty);
        AppendOptional(text, item?.Description, string.Empty);
        AppendLinkOrText(text, item?.SourceUrl, "Открыть лот");
        AppendMoney(text, item?.UnitPrice, item?.CurrencyCode, "Максимум клиента", string.Empty);
        text.AppendLine();
    }

    private static void AppendTickets(StringBuilder text, OrderItem? item)
    {
        text.AppendLine($"<b>{TelegramBotText.Escape(item?.Name ?? "Запрос на билеты")}</b>");

        var details = ParseDetails(item?.Description);
        AppendOptional(text, GetDetail(details, "Город / место"), "📍 ");
        AppendOptional(text, GetDetail(details, "Дата"), "📅 ");
        if (item is not null)
        {
            text.AppendLine($"🎟 <b>{FormatTicketCount(item.Quantity)}</b>");
        }

        AppendOptional(text, GetDetail(details, "Комментарий"), "Пожелание: ");

        var budget = GetDetail(details, "Бюджет");
        if (!string.IsNullOrWhiteSpace(budget))
        {
            text.AppendLine($"💴 Бюджет: <b>{TelegramBotText.Escape(budget)}</b>");
        }

        AppendLinkOrText(text, item?.SourceUrl, "Открыть событие");
        text.AppendLine();
    }

    private static void AppendCustomer(StringBuilder text, Order order, bool includeTimeSeparator = true)
    {
        var customer = order.Customer;
        var name = customer is null
            ? null
            : string.Join(" ", new[] { customer.FirstName, customer.LastName, customer.Patronymic }
                .Where(value => !string.IsNullOrWhiteSpace(value)));

        AppendOptional(text, name, "👤 ");
        AppendOptional(text, customer?.Phone, "📞 ");
        AppendOptional(text, NormalizeTelegram(customer?.Telegram), "💬 ");
        AppendOptional(text, customer?.WhatsApp, "WhatsApp: ");
        AppendOptional(text, customer?.Vk, "VK: ");

        var address = string.Join(", ", new[]
        {
            order.DeliveryPostalCode,
            order.DeliveryCity,
            order.DeliveryStreet,
            order.DeliveryBuilding,
            order.DeliveryApartment,
            order.DeliveryNote,
        }.Where(value => !string.IsNullOrWhiteSpace(value)));
        AppendOptional(text, address, "📍 ");

        if (includeTimeSeparator && text.Length > 0)
        {
            text.AppendLine();
        }
    }

    private string FormatLocalTime(DateTimeOffset value)
    {
        var local = TimeZoneInfo.ConvertTime(value, _timeZone);
        return local.ToString("d MMMM, HH:mm", RussianCulture);
    }

    private static void AppendMoney(
        StringBuilder text,
        decimal? amount,
        string? currency,
        string label,
        string prefix)
    {
        if (amount.HasValue)
        {
            text.AppendLine($"💴 {label}: <b>{prefix}{FormatMoney(amount.Value, currency)}</b>");
        }
    }

    private static string FormatMoney(decimal amount, string? currency)
    {
        var symbol = currency?.ToUpperInvariant() switch
        {
            "JPY" => "¥",
            "RUB" => "₽",
            "USD" => "$",
            "EUR" => "€",
            "GBP" => "£",
            _ => string.IsNullOrWhiteSpace(currency) ? string.Empty : $"{currency} ",
        };

        return $"{symbol}{amount.ToString("N0", RussianCulture)}";
    }

    private static void AppendLinkOrText(StringBuilder text, string? value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme is "http" or "https")
        {
            text.AppendLine($"🔗 <a href=\"{TelegramBotText.EscapeAttribute(uri.AbsoluteUri)}\">{label}</a>");
            return;
        }

        text.AppendLine($"🔗 {TelegramBotText.Escape(value)}");
    }

    private static void AppendOptional(StringBuilder text, string? value, string prefix)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            text.AppendLine(prefix + TelegramBotText.Escape(value.Trim()));
        }
    }

    private static Dictionary<string, string> ParseDetails(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        return description.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(line => line.Split(':', 2, StringSplitOptions.TrimEntries))
            .Where(parts => parts.Length == 2 && !string.IsNullOrWhiteSpace(parts[1]))
            .GroupBy(parts => parts[0], StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First()[1], StringComparer.OrdinalIgnoreCase);
    }

    private static string? GetDetail(IReadOnlyDictionary<string, string> details, string key)
    {
        return details.TryGetValue(key, out var value) ? value : null;
    }

    private static string? GetMarketplace(string? sourceUrl)
    {
        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri))
        {
            return null;
        }

        var host = uri.Host.ToLowerInvariant();
        if (host.Contains("yahoo"))
        {
            return "Yahoo! Auctions Japan";
        }

        if (host.Contains("mercari"))
        {
            return "Mercari";
        }

        if (host.Contains("rakuten"))
        {
            return "Rakuten";
        }

        return uri.Host;
    }

    private static string NormalizeTelegram(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)
            || value.StartsWith('@')
            || value.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return value ?? string.Empty;
        }

        return $"@{value}";
    }

    private static string FormatPositionCount(int count)
    {
        return count % 10 == 1 && count % 100 != 11
            ? $"{count} позиция"
            : count % 10 is >= 2 and <= 4 && count % 100 is not (>= 12 and <= 14)
                ? $"{count} позиции"
                : $"{count} позиций";
    }

    private static string FormatTicketCount(int count)
    {
        return count % 10 == 1 && count % 100 != 11
            ? $"{count} билет"
            : count % 10 is >= 2 and <= 4 && count % 100 is not (>= 12 and <= 14)
                ? $"{count} билета"
                : $"{count} билетов";
    }

    private static TimeZoneInfo ResolveTimeZone(string? configuredId)
    {
        foreach (var id in new[] { configuredId, "Europe/Moscow", "Russian Standard Time" })
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                continue;
            }

            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.Utc;
    }
}
