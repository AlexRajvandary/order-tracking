namespace OrderTracking.Infrastructure.Ai;

internal static class AiOrderDraftJsonSchema
{
    /// <summary>
    /// Strict Structured Outputs schema. All properties required; nullables use type unions.
    /// </summary>
    public static BinaryData Create() =>
        BinaryData.FromString(
            """
            {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "customer": {
                  "anyOf": [
                    { "type": "null" },
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "properties": {
                        "lastName": { "type": ["string", "null"] },
                        "firstName": { "type": ["string", "null"] },
                        "patronymic": { "type": ["string", "null"] },
                        "telegram": { "type": ["string", "null"] },
                        "phone": { "type": ["string", "null"] },
                        "email": { "type": ["string", "null"] }
                      },
                      "required": ["lastName", "firstName", "patronymic", "telegram", "phone", "email"]
                    }
                  ]
                },
                "items": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "itemType": { "type": ["string", "null"], "description": "Product or Service" },
                      "name": { "type": ["string", "null"] },
                      "url": { "type": ["string", "null"] },
                      "description": { "type": ["string", "null"] },
                      "quantity": { "type": ["integer", "null"] },
                      "unitPrice": { "type": ["number", "null"] },
                      "currencyCode": { "type": ["string", "null"], "description": "ISO currency: RUB, JPY, USD, EUR, GBP" }
                    },
                    "required": ["itemType", "name", "url", "description", "quantity", "unitPrice", "currencyCode"]
                  }
                },
                "delivery": {
                  "anyOf": [
                    { "type": "null" },
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "properties": {
                        "city": { "type": ["string", "null"] },
                        "street": { "type": ["string", "null"] },
                        "building": { "type": ["string", "null"] },
                        "apartment": { "type": ["string", "null"] },
                        "postalCode": { "type": ["string", "null"] },
                        "note": { "type": ["string", "null"] }
                      },
                      "required": ["city", "street", "building", "apartment", "postalCode", "note"]
                    }
                  ]
                },
                "payment": {
                  "anyOf": [
                    { "type": "null" },
                    {
                      "type": "object",
                      "additionalProperties": false,
                      "properties": {
                        "prepayment": { "type": ["number", "null"] },
                        "currencyCode": { "type": ["string", "null"] }
                      },
                      "required": ["prepayment", "currencyCode"]
                    }
                  ]
                },
                "comment": { "type": ["string", "null"] },
                "missingFields": {
                  "type": "array",
                  "items": { "type": "string" }
                },
                "uncertainFields": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "field": { "type": "string" },
                      "reason": { "type": "string" }
                    },
                    "required": ["field", "reason"]
                  }
                }
              },
              "required": ["customer", "items", "delivery", "payment", "comment", "missingFields", "uncertainFields"]
            }
            """);
}
