using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemCurrencyAndUnitPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Price",
                table: "order_items",
                newName: "UnitPrice");

            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "order_items",
                type: "character(3)",
                fixedLength: true,
                maxLength: 3,
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE order_items
                SET "CurrencyCode" = 'RUB'
                WHERE "UnitPrice" IS NOT NULL AND "CurrencyCode" IS NULL;
                """);

            migrationBuilder.AddCheckConstraint(
                name: "CK_order_items_price_currency",
                table: "order_items",
                sql: "(\"UnitPrice\" IS NULL AND \"CurrencyCode\" IS NULL)\r\nOR (\r\n    \"UnitPrice\" IS NOT NULL\r\n    AND \"UnitPrice\" >= 0\r\n    AND \"CurrencyCode\" IN ('RUB', 'USD', 'EUR', 'GBP', 'JPY')\r\n)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_order_items_price_currency",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "order_items");

            migrationBuilder.RenameColumn(
                name: "UnitPrice",
                table: "order_items",
                newName: "Price");
        }
    }
}
