using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddZozoProductDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "product_variants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ExternalColorId",
                table: "product_variants",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ExternalSizeId",
                table: "product_variants",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProductColorId",
                table: "product_variants",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProductSizeId",
                table: "product_variants",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_colors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_colors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_colors_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_media",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    MediaType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    ExternalId = table.Column<long>(type: "bigint", nullable: true),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    FileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_media", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_media_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_sizes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShortName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SpecificationsJson = table.Column<string>(type: "jsonb", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_sizes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_sizes_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_source_details",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Material = table.Column<string>(type: "text", nullable: true),
                    Availability = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExternalGoodsId = table.Column<long>(type: "bigint", nullable: true),
                    ExternalGoodsDetailId = table.Column<long>(type: "bigint", nullable: true),
                    ExternalGoodsTypeId = table.Column<long>(type: "bigint", nullable: true),
                    ExternalShopId = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_source_details", x => x.ProductId);
                    table.ForeignKey(
                        name: "FK_product_source_details_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_product_variants_ProductColorId",
                table: "product_variants",
                column: "ProductColorId");

            migrationBuilder.CreateIndex(
                name: "IX_product_variants_ProductSizeId",
                table: "product_variants",
                column: "ProductSizeId");

            migrationBuilder.CreateIndex(
                name: "IX_product_colors_ProductId",
                table: "product_colors",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_colors_ProductId_ExternalId",
                table: "product_colors",
                columns: new[] { "ProductId", "ExternalId" },
                unique: true,
                filter: "\"ExternalId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_product_media_ProductId",
                table: "product_media",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sizes_ProductId",
                table: "product_sizes",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_sizes_ProductId_ExternalId",
                table: "product_sizes",
                columns: new[] { "ProductId", "ExternalId" },
                unique: true,
                filter: "\"ExternalId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_product_source_details_Source_ExternalGoodsId",
                table: "product_source_details",
                columns: new[] { "Source", "ExternalGoodsId" });

            migrationBuilder.AddForeignKey(
                name: "FK_product_variants_product_colors_ProductColorId",
                table: "product_variants",
                column: "ProductColorId",
                principalTable: "product_colors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_product_variants_product_sizes_ProductSizeId",
                table: "product_variants",
                column: "ProductSizeId",
                principalTable: "product_sizes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_product_variants_product_colors_ProductColorId",
                table: "product_variants");

            migrationBuilder.DropForeignKey(
                name: "FK_product_variants_product_sizes_ProductSizeId",
                table: "product_variants");

            migrationBuilder.DropTable(
                name: "product_colors");

            migrationBuilder.DropTable(
                name: "product_media");

            migrationBuilder.DropTable(
                name: "product_sizes");

            migrationBuilder.DropTable(
                name: "product_source_details");

            migrationBuilder.DropIndex(
                name: "IX_product_variants_ProductColorId",
                table: "product_variants");

            migrationBuilder.DropIndex(
                name: "IX_product_variants_ProductSizeId",
                table: "product_variants");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "product_variants");

            migrationBuilder.DropColumn(
                name: "ExternalColorId",
                table: "product_variants");

            migrationBuilder.DropColumn(
                name: "ExternalSizeId",
                table: "product_variants");

            migrationBuilder.DropColumn(
                name: "ProductColorId",
                table: "product_variants");

            migrationBuilder.DropColumn(
                name: "ProductSizeId",
                table: "product_variants");
        }
    }
}
