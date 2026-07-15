using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SplitCustomerFullNameIntoParts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "FullName",
                table: "customers",
                newName: "LastName");

            migrationBuilder.RenameIndex(
                name: "IX_customers_FullName",
                table: "customers",
                newName: "IX_customers_LastName");

            migrationBuilder.AddColumn<string>(
                name: "FirstName",
                table: "customers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Patronymic",
                table: "customers",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_customers_FirstName",
                table: "customers",
                column: "FirstName",
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_customers_FirstName",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "FirstName",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "Patronymic",
                table: "customers");

            migrationBuilder.RenameColumn(
                name: "LastName",
                table: "customers",
                newName: "FullName");

            migrationBuilder.RenameIndex(
                name: "IX_customers_LastName",
                table: "customers",
                newName: "IX_customers_FullName");
        }
    }
}
