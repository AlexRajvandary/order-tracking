using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddYuGiOhSets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SetId",
                table: "yugioh_card_specifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "yugioh_sets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceKey = table.Column<string>(type: "character varying(620)", maxLength: 620, nullable: false),
                    NameOriginal = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    NameRu = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MetadataRaw = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AlternateNameOriginal = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AlternateNameRu = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ReleaseTypeCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReleaseTypeRu = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReleaseDate = table.Column<DateOnly>(type: "date", nullable: true),
                    DeclaredCardCount = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yugioh_sets", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_card_specifications_SetId",
                table: "yugioh_card_specifications",
                column: "SetId");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_sets_ReleaseDate",
                table: "yugioh_sets",
                column: "ReleaseDate");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_sets_ReleaseTypeCode",
                table: "yugioh_sets",
                column: "ReleaseTypeCode");

            migrationBuilder.CreateIndex(
                name: "IX_yugioh_sets_SourceKey",
                table: "yugioh_sets",
                column: "SourceKey",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_yugioh_card_specifications_yugioh_sets_SetId",
                table: "yugioh_card_specifications",
                column: "SetId",
                principalTable: "yugioh_sets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Backfill the new set aggregate from the denormalized fields. The
            // original columns remain intact for backwards compatibility.
            migrationBuilder.Sql("""
                INSERT INTO yugioh_sets
                    ("Id", "SourceKey", "NameOriginal", "NameRu", "MetadataRaw",
                     "AlternateNameOriginal", "AlternateNameRu", "ReleaseTypeCode",
                     "ReleaseTypeRu", "ReleaseDate", "DeclaredCardCount")
                SELECT DISTINCT ON (upper(btrim(t."SetName")) || '|' || coalesce(to_char(y."ReleaseDate", 'YYYY-MM-DD'), ''))
                    gen_random_uuid(),
                    upper(btrim(t."SetName")) || '|' || coalesce(to_char(y."ReleaseDate", 'YYYY-MM-DD'), ''),
                    t."SetName",
                    y."SetNameRu",
                    y."SeriesMetadataRaw",
                    y."SeriesAlternateName",
                    y."SeriesAlternateNameRu",
                    y."SeriesType",
                    y."SeriesTypeRu",
                    y."ReleaseDate",
                    y."DeclaredCardCount"
                FROM yugioh_card_specifications y
                JOIN tcg_card_specifications t ON t."ProductId" = y."ProductId"
                WHERE nullif(btrim(t."SetName"), '') IS NOT NULL
                ORDER BY upper(btrim(t."SetName")) || '|' || coalesce(to_char(y."ReleaseDate", 'YYYY-MM-DD'), ''), y."ProductId";

                UPDATE yugioh_card_specifications y
                SET "SetId" = s."Id"
                FROM tcg_card_specifications t
                JOIN yugioh_sets s
                  ON s."SourceKey" = upper(btrim(t."SetName")) || '|' || coalesce(to_char(y."ReleaseDate", 'YYYY-MM-DD'), '')
                WHERE t."ProductId" = y."ProductId"
                  AND nullif(btrim(t."SetName"), '') IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_yugioh_card_specifications_yugioh_sets_SetId",
                table: "yugioh_card_specifications");

            migrationBuilder.DropTable(
                name: "yugioh_sets");

            migrationBuilder.DropIndex(
                name: "IX_yugioh_card_specifications_SetId",
                table: "yugioh_card_specifications");

            migrationBuilder.DropColumn(
                name: "SetId",
                table: "yugioh_card_specifications");
        }
    }
}
