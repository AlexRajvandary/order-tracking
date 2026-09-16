using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLaptopSpecifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "laptop_specifications",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Model = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ModelNumber = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Color = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Processor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    RamGb = table.Column<int>(type: "integer", nullable: true),
                    StorageType = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    StorageGb = table.Column<int>(type: "integer", nullable: true),
                    ScreenSizeInches = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    OperatingSystem = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Office = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Graphics = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    HasCopilotPlus = table.Column<bool>(type: "boolean", nullable: true),
                    ReleaseModel = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    RawSpecificationsJson = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_laptop_specifications", x => x.ProductId);
                    table.ForeignKey(
                        name: "FK_laptop_specifications_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_laptop_specifications_Model",
                table: "laptop_specifications",
                column: "Model");

            migrationBuilder.CreateIndex(
                name: "IX_laptop_specifications_OperatingSystem",
                table: "laptop_specifications",
                column: "OperatingSystem");

            migrationBuilder.CreateIndex(
                name: "IX_laptop_specifications_Processor",
                table: "laptop_specifications",
                column: "Processor");

            migrationBuilder.CreateIndex(
                name: "IX_laptop_specifications_RamGb",
                table: "laptop_specifications",
                column: "RamGb");

            migrationBuilder.CreateIndex(
                name: "IX_laptop_specifications_ScreenSizeInches",
                table: "laptop_specifications",
                column: "ScreenSizeInches");

            migrationBuilder.CreateIndex(
                name: "IX_laptop_specifications_StorageType_StorageGb",
                table: "laptop_specifications",
                columns: new[] { "StorageType", "StorageGb" });

            migrationBuilder.Sql("""
                INSERT INTO categories
                    ("Id", "ParentId", "Name", "Slug", "Description", "ImageUrl", "SortOrder", "IsPopular", "IsActive", "CreatedAt", "UpdatedAt", "IsDeleted", "DeletedAt")
                SELECT
                    '6f10e78e-1eb1-4f9e-8e5f-f4b72d101001'::uuid,
                    parent."Id",
                    'Ноутбуки',
                    'laptops',
                    'Ноутбуки из японских магазинов',
                    NULL,
                    0,
                    FALSE,
                    TRUE,
                    NOW(),
                    NULL,
                    FALSE,
                    NULL
                FROM categories parent
                WHERE parent."ParentId" IS NULL
                  AND LOWER(parent."Slug") = 'electronics'
                  AND NOT parent."IsDeleted"
                  AND NOT EXISTS (
                      SELECT 1 FROM categories existing
                      WHERE existing."ParentId" = parent."Id"
                        AND LOWER(existing."Slug") = 'laptops'
                        AND NOT existing."IsDeleted"
                  )
                LIMIT 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM categories
                WHERE "Id" = '6f10e78e-1eb1-4f9e-8e5f-f4b72d101001'::uuid;
                """);

            migrationBuilder.DropTable(
                name: "laptop_specifications");
        }
    }
}
