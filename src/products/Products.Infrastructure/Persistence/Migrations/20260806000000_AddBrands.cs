using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Products.Infrastructure.Persistence;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(ProductsDbContext))]
    [Migration("20260806000000_AddBrands")]
    public partial class AddBrands : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "brands",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    LogoUrl = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_brands", x => x.Id);
                });

            migrationBuilder.AddColumn<Guid>(
                name: "BrandId",
                table: "products",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_brands_Name",
                table: "brands",
                column: "Name",
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_brands_Slug",
                table: "brands",
                column: "Slug",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_products_BrandId",
                table: "products",
                column: "BrandId");

            migrationBuilder.AddForeignKey(
                name: "FK_products_brands_BrandId",
                table: "products",
                column: "BrandId",
                principalTable: "brands",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_brands_BrandId",
                table: "products");

            migrationBuilder.DropTable(
                name: "brands");

            migrationBuilder.DropIndex(
                name: "IX_products_BrandId",
                table: "products");

            migrationBuilder.DropColumn(
                name: "BrandId",
                table: "products");
        }
    }
}
