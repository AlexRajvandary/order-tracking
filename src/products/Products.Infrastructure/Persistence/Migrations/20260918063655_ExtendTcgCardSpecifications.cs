using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExtendTcgCardSpecifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Franchise",
                table: "tcg_card_specifications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OfficialUrl",
                table: "tcg_card_specifications",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Rarity",
                table: "tcg_card_specifications",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tcg_card_specifications_Franchise",
                table: "tcg_card_specifications",
                column: "Franchise");

            migrationBuilder.Sql("""
                UPDATE tcg_card_specifications
                SET "Franchise" = 'pokemon'
                WHERE NULLIF(trim("CharacterName"), '') IS NOT NULL
                  AND "Franchise" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tcg_card_specifications_Franchise",
                table: "tcg_card_specifications");

            migrationBuilder.DropColumn(
                name: "Franchise",
                table: "tcg_card_specifications");

            migrationBuilder.DropColumn(
                name: "OfficialUrl",
                table: "tcg_card_specifications");

            migrationBuilder.DropColumn(
                name: "Rarity",
                table: "tcg_card_specifications");
        }
    }
}
