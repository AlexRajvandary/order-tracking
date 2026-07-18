using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStatusLocationAndPublishSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultLocation",
                table: "status_definitions",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PublishAfterDays",
                table: "status_definitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "order_item_status_history",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "order_item_status_history",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PublishAt",
                table: "order_item_status_history",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_item_status_history_IsPublished_PublishAt",
                table: "order_item_status_history",
                columns: new[] { "IsPublished", "PublishAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_order_item_status_history_IsPublished_PublishAt",
                table: "order_item_status_history");

            migrationBuilder.DropColumn(
                name: "DefaultLocation",
                table: "status_definitions");

            migrationBuilder.DropColumn(
                name: "PublishAfterDays",
                table: "status_definitions");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "order_item_status_history");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "order_item_status_history");

            migrationBuilder.DropColumn(
                name: "PublishAt",
                table: "order_item_status_history");
        }
    }
}
