using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogCartSelections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_catalog_cart_items_UserId_ProductId",
                table: "catalog_cart_items");

            migrationBuilder.DropIndex(
                name: "IX_catalog_cart_items_VisitorKey_ProductId",
                table: "catalog_cart_items");

            migrationBuilder.AddColumn<string>(
                name: "SelectedColor",
                table: "catalog_cart_items",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SelectedSize",
                table: "catalog_cart_items",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_catalog_cart_items_UserId_ProductId_SelectedColor_SelectedS~",
                table: "catalog_cart_items",
                columns: new[] { "UserId", "ProductId", "SelectedColor", "SelectedSize" },
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_catalog_cart_items_VisitorKey_ProductId_SelectedColor_Selec~",
                table: "catalog_cart_items",
                columns: new[] { "VisitorKey", "ProductId", "SelectedColor", "SelectedSize" },
                unique: true,
                filter: "\"VisitorKey\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_catalog_cart_items_UserId_ProductId_SelectedColor_SelectedS~",
                table: "catalog_cart_items");

            migrationBuilder.DropIndex(
                name: "IX_catalog_cart_items_VisitorKey_ProductId_SelectedColor_Selec~",
                table: "catalog_cart_items");

            migrationBuilder.DropColumn(
                name: "SelectedColor",
                table: "catalog_cart_items");

            migrationBuilder.DropColumn(
                name: "SelectedSize",
                table: "catalog_cart_items");

            migrationBuilder.CreateIndex(
                name: "IX_catalog_cart_items_UserId_ProductId",
                table: "catalog_cart_items",
                columns: new[] { "UserId", "ProductId" },
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_catalog_cart_items_VisitorKey_ProductId",
                table: "catalog_cart_items",
                columns: new[] { "VisitorKey", "ProductId" },
                unique: true,
                filter: "\"VisitorKey\" IS NOT NULL");
        }
    }
}
