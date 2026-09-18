using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOnePieceCharacterSpecifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "one_piece_character_specifications",
                columns: table => new
                {
                    CharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Crew = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    DevilFruit = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Role = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    FirstAppearance = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_one_piece_character_specifications", x => x.CharacterId);
                    table.ForeignKey(
                        name: "FK_one_piece_character_specifications_tcg_characters_Character~",
                        column: x => x.CharacterId,
                        principalTable: "tcg_characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_one_piece_character_specifications_Crew",
                table: "one_piece_character_specifications",
                column: "Crew");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "one_piece_character_specifications");
        }
    }
}
