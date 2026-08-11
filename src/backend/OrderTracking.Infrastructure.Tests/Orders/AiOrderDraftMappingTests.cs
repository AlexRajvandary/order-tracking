using OrderTracking.Application.Orders.AiParse;
using OrderTracking.Infrastructure.Ai;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Orders;

public sealed class AiOrderDraftMappingTests
{
    [Fact]
    public void Map_AndNormalize_MapsStructuredResponse()
    {
        var raw = new OpenAiOrderParser.AiOrderDraftRaw
        {
            Customer = new OpenAiOrderParser.AiOrderCustomerRaw
            {
                FirstName = "Иван",
                Phone = "+7 (999) 123-45-67",
            },
            Items =
            [
                new OpenAiOrderParser.AiOrderItemRaw
                {
                    ItemType = "Product",
                    Name = "Sony WH-1000XM5",
                    Url = "https://example.jp/item/123",
                    Quantity = 2,
                    UnitPrice = 34800,
                    CurrencyCode = "jpy",
                },
            ],
            Delivery = new OpenAiOrderParser.AiOrderDeliveryRaw
            {
                City = "Москва",
            },
            Payment = new OpenAiOrderParser.AiOrderPaymentRaw
            {
                Prepayment = 50000,
                CurrencyCode = "RUB",
            },
            Comment = "из переписки",
            MissingFields = ["delivery.street", "customer.lastName"],
            UncertainFields =
            [
                new OpenAiOrderParser.AiUncertainFieldRaw
                {
                    Field = "items[0].unitPrice",
                    Reason = "изображение нечёткое",
                },
            ],
        };

        var draft = AiOrderDraftNormalizer.Normalize(OpenAiOrderParser.Map(raw));

        Assert.NotNull(draft.Customer);
        Assert.Equal("Иван", draft.Customer!.FirstName);
        Assert.Equal("+79991234567", draft.Customer.Phone);
        Assert.Single(draft.Items);
        Assert.Equal("Sony WH-1000XM5", draft.Items[0].Name);
        Assert.Equal("https://example.jp/item/123", draft.Items[0].Url);
        Assert.Equal(2, draft.Items[0].Quantity);
        Assert.Equal(34800, draft.Items[0].UnitPrice);
        Assert.Equal("JPY", draft.Items[0].CurrencyCode);
        Assert.Equal("Москва", draft.Delivery?.City);
        Assert.Equal(50000, draft.Payment?.Prepayment);
        Assert.Equal("RUB", draft.Payment?.CurrencyCode);
        Assert.Contains("delivery.street", draft.MissingFields);
        Assert.Contains("customer.lastName", draft.MissingFields);
        Assert.Single(draft.UncertainFields);
        Assert.Equal("items[0].unitPrice", draft.UncertainFields[0].Field);
    }

    [Fact]
    public void Normalize_DropsEmptyItems_AndDefaultsQuantity()
    {
        var draft = AiOrderDraftNormalizer.Normalize(new AiOrderDraft(
            null,
            [
                new AiOrderItemDraft("Product", "Item", null, null, null, 100, "RUB"),
                new AiOrderItemDraft(null, null, null, null, null, null, null),
            ],
            null,
            null,
            "  ",
            ["  ", "customer.phone"],
            [new AiUncertainField(" customer.phone ", " blurry ")]));

        Assert.Single(draft.Items);
        Assert.Equal(1, draft.Items[0].Quantity);
        Assert.Null(draft.Comment);
        Assert.Equal(["customer.phone"], draft.MissingFields);
        Assert.Equal("customer.phone", draft.UncertainFields[0].Field);
        Assert.Equal("blurry", draft.UncertainFields[0].Reason);
    }

    [Fact]
    public void Normalize_DoesNotInventCountryCode()
    {
        var draft = AiOrderDraftNormalizer.Normalize(new AiOrderDraft(
            new AiOrderCustomerDraft(null, "Ivan", null, null, "9991234567", null),
            [],
            null,
            null,
            null,
            [],
            []));

        Assert.Equal("9991234567", draft.Customer!.Phone);
    }
}
