using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminTelegramId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "TelegramId",
                table: "admin_users",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TelegramUsername",
                table: "admin_users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_admin_users_TelegramId",
                table: "admin_users",
                column: "TelegramId",
                unique: true,
                filter: "\"TelegramId\" IS NOT NULL AND \"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_admin_users_TelegramId",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "TelegramId",
                table: "admin_users");

            migrationBuilder.DropColumn(
                name: "TelegramUsername",
                table: "admin_users");
        }
    }
}
