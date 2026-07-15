using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerAddressesAndOrderDelivery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DeliveryAddressId",
                table: "orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryApartment",
                table: "orders",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryBuilding",
                table: "orders",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryCity",
                table: "orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryNote",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryPostalCode",
                table: "orders",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliveryStreet",
                table: "orders",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "customer_addresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    City = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Street = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Building = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Apartment = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_addresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_addresses_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_orders_DeliveryAddressId",
                table: "orders",
                column: "DeliveryAddressId",
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_customer_addresses_CustomerId",
                table: "customer_addresses",
                column: "CustomerId",
                filter: "\"IsDeleted\" = false");

            migrationBuilder.AddForeignKey(
                name: "FK_orders_customer_addresses_DeliveryAddressId",
                table: "orders",
                column: "DeliveryAddressId",
                principalTable: "customer_addresses",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_orders_customer_addresses_DeliveryAddressId",
                table: "orders");

            migrationBuilder.DropTable(
                name: "customer_addresses");

            migrationBuilder.DropIndex(
                name: "IX_orders_DeliveryAddressId",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DeliveryAddressId",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DeliveryApartment",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DeliveryBuilding",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DeliveryCity",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DeliveryNote",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DeliveryPostalCode",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DeliveryStreet",
                table: "orders");
        }
    }
}
