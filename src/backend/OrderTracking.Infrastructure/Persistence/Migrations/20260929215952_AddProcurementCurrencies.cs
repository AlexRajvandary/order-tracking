using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProcurementCurrencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PurchaseCurrencyCode",
                table: "order_item_procurements",
                type: "character(3)",
                fixedLength: true,
                maxLength: 3,
                nullable: false,
                defaultValue: "JPY");

            migrationBuilder.AddColumn<string>(
                name: "ShippingCurrencyCode",
                table: "order_item_procurements",
                type: "character(3)",
                fixedLength: true,
                maxLength: 3,
                nullable: false,
                defaultValue: "JPY");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PurchaseCurrencyCode",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "ShippingCurrencyCode",
                table: "order_item_procurements");
        }
    }
}
