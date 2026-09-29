using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExtendOrderItemProcurements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ArrivalUrl",
                table: "order_item_procurements",
                newName: "WarehouseTrackingNumber");

            migrationBuilder.RenameColumn(
                name: "ShipmentUrl",
                table: "order_item_procurements",
                newName: "ShippingTrackingNumber");

            migrationBuilder.AddColumn<decimal>(
                name: "PurchasePrice",
                table: "order_item_procurements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SellerOrderNumber",
                table: "order_item_procurements",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ShippedAt",
                table: "order_item_procurements",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingCost",
                table: "order_item_procurements",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingMethod",
                table: "order_item_procurements",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingWeight",
                table: "order_item_procurements",
                type: "numeric(12,3)",
                precision: 12,
                scale: 3,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WarehouseCondition",
                table: "order_item_procurements",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "WarehouseReceivedAt",
                table: "order_item_procurements",
                type: "date",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "order_item_procurement_attachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcurementId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ObjectKey = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_item_procurement_attachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_item_procurement_attachments_order_item_procurements_~",
                        column: x => x.ProcurementId,
                        principalTable: "order_item_procurements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_order_item_procurement_attachments_ProcurementId_Kind",
                table: "order_item_procurement_attachments",
                columns: new[] { "ProcurementId", "Kind" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "order_item_procurement_attachments");

            migrationBuilder.DropColumn(
                name: "PurchasePrice",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "SellerOrderNumber",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "ShippedAt",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "ShippingCost",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "ShippingMethod",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "ShippingWeight",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "WarehouseCondition",
                table: "order_item_procurements");

            migrationBuilder.DropColumn(
                name: "WarehouseReceivedAt",
                table: "order_item_procurements");

            migrationBuilder.RenameColumn(
                name: "WarehouseTrackingNumber",
                table: "order_item_procurements",
                newName: "ArrivalUrl");

            migrationBuilder.RenameColumn(
                name: "ShippingTrackingNumber",
                table: "order_item_procurements",
                newName: "ShipmentUrl");
        }
    }
}
