using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTcgCharacters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tcg_characters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Franchise = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AlternateName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tcg_characters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tcg_card_characters",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tcg_card_characters", x => new { x.ProductId, x.CharacterId });
                    table.ForeignKey(
                        name: "FK_tcg_card_characters_tcg_card_specifications_ProductId",
                        column: x => x.ProductId,
                        principalTable: "tcg_card_specifications",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tcg_card_characters_tcg_characters_CharacterId",
                        column: x => x.CharacterId,
                        principalTable: "tcg_characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tcg_card_characters_CharacterId",
                table: "tcg_card_characters",
                column: "CharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_tcg_characters_Franchise_Name",
                table: "tcg_characters",
                columns: new[] { "Franchise", "Name" },
                unique: true);

            // Existing TCG rows are Pokémon imports. Preserve their character filter data
            // while moving new imports to the normalized many-to-many model.
            migrationBuilder.Sql("""
                INSERT INTO tcg_characters ("Id", "Franchise", "Name", "AlternateName")
                SELECT md5('pokemon:' || lower(trim("CharacterName")))::uuid,
                       'pokemon', min(trim("CharacterName")), NULL
                FROM tcg_card_specifications
                WHERE NULLIF(trim("CharacterName"), '') IS NOT NULL
                GROUP BY lower(trim("CharacterName"));

                INSERT INTO tcg_card_characters ("ProductId", "CharacterId")
                SELECT specification."ProductId",
                       md5('pokemon:' || lower(trim(specification."CharacterName")))::uuid
                FROM tcg_card_specifications specification
                WHERE NULLIF(trim(specification."CharacterName"), '') IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tcg_card_characters");

            migrationBuilder.DropTable(
                name: "tcg_characters");
        }
    }
}
