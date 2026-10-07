using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.Persistence;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace OrderTracking.Infrastructure.TelegramBot;

public sealed class CustomerTelegramNotifier(
    CustomerTelegramBotRuntime runtime,
    ApplicationDbContext db,
    IObjectStorage objectStorage,
    ILogger<CustomerTelegramNotifier> logger) : ICustomerTelegramNotifier
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public bool IsConfigured => runtime.Client is not null;

    public async Task SendOrderCreatedAsync(Guid orderId, long telegramId, CancellationToken cancellationToken = default)
    {
        if (runtime.Client is not { } bot) throw new InvalidOperationException("Customer Telegram bot is not configured.");
        var order = await db.Orders.AsNoTracking().Include(item => item.Customer).Include(item => item.Items)
            .SingleOrDefaultAsync(item => item.Id == orderId, cancellationToken)
            ?? throw new KeyNotFoundException("Order not found for customer notification.");
        var text = BuildMessage(order);
        var images = JsonSerializer.Deserialize<IReadOnlyList<TelegramImageAttachment>>(order.RequestImagesJson, JsonOptions) ?? [];
        if (images.Count == 0)
        {
            await bot.SendMessage(telegramId, text, parseMode: ParseMode.Html, cancellationToken: cancellationToken);
            return;
        }

        var first = images[0];
        await using (var stream = await objectStorage.GetAsync(first.ObjectKey, cancellationToken))
        {
            await bot.SendPhoto(telegramId, InputFile.FromStream(stream, first.FileName),
                caption: $"Фото к заявке {Escape(order.TrackingCode)}", parseMode: ParseMode.Html, cancellationToken: cancellationToken);
        }

        await bot.SendMessage(telegramId, text, parseMode: ParseMode.Html, cancellationToken: cancellationToken);

        for (var index = 1; index < images.Count; index++)
        {
            var image = images[index];
            try
            {
                await using var stream = await objectStorage.GetAsync(image.ObjectKey, cancellationToken);
                await bot.SendPhoto(telegramId, InputFile.FromStream(stream, image.FileName),
                    caption: $"Фото к заявке {Escape(order.TrackingCode)}", parseMode: ParseMode.Html,
                    cancellationToken: cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Could not send attachment {ImageIndex} for order {OrderId}", index, order.Id);
            }
        }
    }

    private static string BuildMessage(OrderTracking.Domain.Entities.Order order)
    {
        var text = new StringBuilder();
        text.AppendLine("✅ <b>Заявка создана</b>");
        text.AppendLine($"Номер: <b>{Escape(order.TrackingCode)}</b>");
        if (order.Customer is { } customer)
        {
            Add(text, "Имя", customer.LastName is null && customer.FirstName is null
                ? null : $"{customer.LastName} {customer.FirstName} {customer.Patronymic}".Trim());
            Add(text, "Телефон", customer.Phone);
            Add(text, "Контакт Telegram", customer.Telegram);
            Add(text, "WhatsApp", customer.WhatsApp);
            Add(text, "VK", customer.Vk);
        }
        var address = string.Join(", ", new[] { order.DeliveryCity, order.DeliveryStreet, order.DeliveryBuilding, order.DeliveryApartment, order.DeliveryPostalCode }
            .Where(value => !string.IsNullOrWhiteSpace(value)));
        Add(text, "Адрес", address);
        Add(text, "Комментарий к доставке", order.DeliveryNote);
        foreach (var item in order.Items.OrderBy(item => item.SortOrder))
        {
            text.AppendLine();
            text.AppendLine($"<b>{Escape(item.Name)}</b>{(item.Quantity > 1 ? $" × {item.Quantity}" : string.Empty)}");
            Add(text, "Описание", item.Description);
            Add(text, "Ссылка", item.SourceUrl);
        }
        var result = text.ToString().Trim();
        return Truncate(result, 3900);
    }

    private static void Add(StringBuilder text, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value)) text.AppendLine($"{label}: {Escape(value)}");
    }

    private static string Escape(string value) => WebUtility.HtmlEncode(value);
    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..(max - 1)] + "…";
}
