using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UnifyProcurementLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrentStatus",
                table: "order_item_procurements",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "RequiredPurchase");

            migrationBuilder.CreateTable(
                name: "order_item_procurement_errors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcurementId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    StatusAtCreation = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    StageAtCreation = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsBlocking = table.Column<bool>(type: "boolean", nullable: false),
                    IsResolved = table.Column<bool>(type: "boolean", nullable: false),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ResolvedByAdminId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_item_procurement_errors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_item_procurement_errors_order_item_procurements_Procu~",
                        column: x => x.ProcurementId,
                        principalTable: "order_item_procurements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "order_item_procurement_status_history",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcurementId = table.Column<Guid>(type: "uuid", nullable: false),
                    PreviousStatus = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    ChangedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ChangedByAdminId = table.Column<Guid>(type: "uuid", nullable: true),
                    Comment = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_item_procurement_status_history", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_item_procurement_status_history_order_item_procuremen~",
                        column: x => x.ProcurementId,
                        principalTable: "order_item_procurements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_order_item_procurement_errors_ProcurementId_CreatedAt",
                table: "order_item_procurement_errors",
                columns: new[] { "ProcurementId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_order_item_procurement_errors_ProcurementId_IsResolved_IsBl~",
                table: "order_item_procurement_errors",
                columns: new[] { "ProcurementId", "IsResolved", "IsBlocking" });

            migrationBuilder.CreateIndex(
                name: "IX_order_item_procurement_status_history_ProcurementId_Changed~",
                table: "order_item_procurement_status_history",
                columns: new[] { "ProcurementId", "ChangedAt" });

            migrationBuilder.Sql("""
                UPDATE order_item_procurements
                SET "CurrentStatus" = CASE
                    WHEN "PurchaseStatus" IN ('Pending', 'Error') THEN 'RequiredPurchase'
                    WHEN "ShipmentStatus" = 'Delivered' THEN 'Delivered'
                    WHEN "ShipmentStatus" = 'Shipped' THEN 'HandedToDelivery'
                    WHEN "ArrivalStatus" = 'InTransit' THEN 'SentToMoscow'
                    WHEN "ArrivalStatus" = 'Received' THEN 'ArrivedMoscow'
                    ELSE 'AwaitingWarehouse'
                END;

                INSERT INTO order_item_procurement_status_history
                    ("Id", "ProcurementId", "PreviousStatus", "Status", "ChangedAt", "ChangedByAdminId", "Comment")
                SELECT gen_random_uuid(), "Id", NULL, "CurrentStatus", COALESCE("UpdatedAt", "CreatedAt"), NULL,
                    'Migrated from legacy procurement status fields'
                FROM order_item_procurements;

                ALTER TABLE order_item_procurements DROP COLUMN "ArrivalStatus";
                ALTER TABLE order_item_procurements DROP COLUMN "PurchaseStatus";
                ALTER TABLE order_item_procurements DROP COLUMN "ShipmentStatus";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "order_item_procurement_errors");

            migrationBuilder.DropTable(
                name: "order_item_procurement_status_history");

            migrationBuilder.AddColumn<string>(
                name: "ArrivalStatus",
                table: "order_item_procurements",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PurchaseStatus",
                table: "order_item_procurements",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ShipmentStatus",
                table: "order_item_procurements",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "AwaitingShipment");

            migrationBuilder.Sql("""
                UPDATE order_item_procurements
                SET "PurchaseStatus" = CASE WHEN "CurrentStatus" = 'RequiredPurchase' THEN 'Pending' ELSE 'Purchased' END,
                    "ArrivalStatus" = CASE
                        WHEN "CurrentStatus" IN ('SentToMoscow', 'ArrivedMoscow', 'AwaitingCustomerShipment', 'HandedToDelivery', 'Delivered') THEN 'Received'
                        WHEN "CurrentStatus" IN ('SentToTransit', 'ArrivedTransitCountry', 'AwaitingMoscowShipment') THEN 'InTransit'
                        ELSE 'Pending'
                    END,
                    "ShipmentStatus" = CASE
                        WHEN "CurrentStatus" = 'Delivered' THEN 'Delivered'
                        WHEN "CurrentStatus" = 'HandedToDelivery' THEN 'Shipped'
                        ELSE 'AwaitingShipment'
                    END;
                """);

            migrationBuilder.DropColumn(
                name: "CurrentStatus",
                table: "order_item_procurements");
        }
    }
}
