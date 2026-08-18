using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "catalog_cart_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    VisitorKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_catalog_cart_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_catalog_cart_items_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "catalog_favorites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    VisitorKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_catalog_favorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_catalog_favorites_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_catalog_cart_items_ProductId",
                table: "catalog_cart_items",
                column: "ProductId");

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

            migrationBuilder.CreateIndex(
                name: "IX_catalog_favorites_ProductId",
                table: "catalog_favorites",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_catalog_favorites_UserId_ProductId",
                table: "catalog_favorites",
                columns: new[] { "UserId", "ProductId" },
                unique: true,
                filter: "\"UserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_catalog_favorites_VisitorKey_ProductId",
                table: "catalog_favorites",
                columns: new[] { "VisitorKey", "ProductId" },
                unique: true,
                filter: "\"VisitorKey\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "catalog_cart_items");

            migrationBuilder.DropTable(
                name: "catalog_favorites");
        }
    }
}
