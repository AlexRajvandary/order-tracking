using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTcgCardSpecifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tcg_card_specifications",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    SetName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CardNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ShopLinksJson = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tcg_card_specifications", x => x.ProductId);
                    table.ForeignKey(
                        name: "FK_tcg_card_specifications_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tcg_card_specifications_CharacterName",
                table: "tcg_card_specifications",
                column: "CharacterName");

            migrationBuilder.CreateIndex(
                name: "IX_tcg_card_specifications_SetName_CardNumber",
                table: "tcg_card_specifications",
                columns: new[] { "SetName", "CardNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tcg_card_specifications");
        }
    }
}
