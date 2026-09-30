using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemPreviewImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ManualImageContentType",
                table: "order_items",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManualImageObjectKey",
                table: "order_items",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PreviewFetchedAt",
                table: "order_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewImageContentType",
                table: "order_items",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewImageObjectKey",
                table: "order_items",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewImageSource",
                table: "order_items",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreviewSourceUrl",
                table: "order_items",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualImageContentType",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "ManualImageObjectKey",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "PreviewFetchedAt",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "PreviewImageContentType",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "PreviewImageObjectKey",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "PreviewImageSource",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "PreviewSourceUrl",
                table: "order_items");
        }
    }
}
