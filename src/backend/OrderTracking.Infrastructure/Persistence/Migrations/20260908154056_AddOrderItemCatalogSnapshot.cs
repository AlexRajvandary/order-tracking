using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemCatalogSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AffiliateUrl",
                table: "order_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CatalogProductId",
                table: "order_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalProductId",
                table: "order_items",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "order_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProductSource",
                table: "order_items",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Internal");

            migrationBuilder.AddColumn<string>(
                name: "ShopCode",
                table: "order_items",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShopName",
                table: "order_items",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AffiliateUrl",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "CatalogProductId",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "ExternalProductId",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "ProductSource",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "ShopCode",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "ShopName",
                table: "order_items");
        }
    }
}
