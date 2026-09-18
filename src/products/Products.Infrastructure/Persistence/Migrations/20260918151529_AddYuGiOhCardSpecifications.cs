using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddYuGiOhCardSpecifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "yugioh_card_specifications",
                columns: table => new
                {
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    JapaneseNameReading = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SetNameRu = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CardType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    CardSubtype = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Attribute = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StatsRaw = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MonsterRaceRaw = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    MonsterRaceRu = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DescriptionRu = table.Column<string>(type: "text", nullable: true),
                    SeriesMetadataRaw = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SeriesAlternateName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SeriesAlternateNameRu = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SeriesType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    SeriesTypeRu = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReleaseDate = table.Column<DateOnly>(type: "date", nullable: true),
                    DeclaredCardCount = table.Column<int>(type: "integer", nullable: true),
                    Level = table.Column<int>(type: "integer", nullable: true),
                    Rank = table.Column<int>(type: "integer", nullable: true),
                    LinkRating = table.Column<int>(type: "integer", nullable: true),
                    Attack = table.Column<int>(type: "integer", nullable: true),
                    Defense = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yugioh_card_specifications", x => x.ProductId);
                    table.ForeignKey(
                        name: "FK_yugioh_card_specifications_tcg_card_specifications_ProductId",
                        column: x => x.ProductId,
                        principalTable: "tcg_card_specifications",
                        principalColumn: "ProductId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_Attribute",
                table: "yugioh_card_specifications",
                column: "Attribute");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_CardSubtype",
                table: "yugioh_card_specifications",
                column: "CardSubtype");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_CardType",
                table: "yugioh_card_specifications",
                column: "CardType");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_Level",
                table: "yugioh_card_specifications",
                column: "Level");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_LinkRating",
                table: "yugioh_card_specifications",
                column: "LinkRating");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_MonsterRaceRu",
                table: "yugioh_card_specifications",
                column: "MonsterRaceRu");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_Rank",
                table: "yugioh_card_specifications",
                column: "Rank");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_SeriesType",
                table: "yugioh_card_specifications",
                column: "SeriesType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "yugioh_card_specifications");
        }
    }
}
