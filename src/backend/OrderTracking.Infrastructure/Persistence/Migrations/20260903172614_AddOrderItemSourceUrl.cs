using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemSourceUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceUrl",
                table: "order_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceUrl",
                table: "order_items");
        }
    }
}
