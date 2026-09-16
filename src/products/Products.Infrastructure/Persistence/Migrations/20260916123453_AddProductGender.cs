using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductGender : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "products",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_Gender",
                table: "products",
                column: "Gender");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_products_Gender",
                table: "products");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "products");
        }
    }
}
