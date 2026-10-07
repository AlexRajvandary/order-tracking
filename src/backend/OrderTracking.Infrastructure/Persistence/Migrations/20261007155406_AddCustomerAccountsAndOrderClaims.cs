using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerAccountsAndOrderClaims : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CustomerId",
                table: "admin_users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CustomerNotificationsDisabledByAdmin",
                table: "admin_users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CustomerNotificationsEnabled",
                table: "admin_users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "CustomerTelegramId",
                table: "admin_users",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "customer_email_otps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    Purpose = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CodeHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConsumedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    FailedAttempts = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_email_otps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "customer_order_claims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClaimedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ClaimedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_order_claims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_order_claims_orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_admin_users_CustomerId",
                table: "admin_users",
                column: "CustomerId",
                unique: true,
                filter: "\"CustomerId\" IS NOT NULL AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_admin_users_CustomerTelegramId",
                table: "admin_users",
                column: "CustomerTelegramId",
                unique: true,
                filter: "\"CustomerTelegramId\" IS NOT NULL AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_admin_users_Email",
                table: "admin_users",
                column: "Email",
                unique: true,
                filter: "\"Email\" IS NOT NULL AND \"Role\" = 'Buyer' AND \"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_customer_email_otps_Email_Purpose_CreatedAt",
                table: "customer_email_otps",
                columns: new[] { "Email", "Purpose", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_claims_OrderId",
                table: "customer_order_claims",
                column: "OrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_order_claims_TokenHash",
                table: "customer_order_claims",
                column: "TokenHash",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_admin_users_customers_CustomerId",
                table: "admin_users",
                column: "CustomerId",
                principalTable: "customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_admin_users_customers_CustomerId",
                table: "admin_users");

            migrationBuilder.DropTable(
                name: "customer_email_otps");

            migrationBuilder.DropTable(
                name: "customer_order_claims");

            migrationBuilder.DropIndex(
                name: "IX_admin_users_CustomerId",
                table: "admin_users");

            migrationBuilder.DropIndex(
                name: "IX_admin_users_CustomerTelegramId",
                table: "admin_users");

            migrationBuilder.DropIndex(
                name: "IX_admin_users_Email",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "CustomerId",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "CustomerNotificationsDisabledByAdmin",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "CustomerNotificationsEnabled",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "CustomerTelegramId",
                table: "admin_users");
        }
    }
}
