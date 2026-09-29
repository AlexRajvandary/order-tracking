using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderItemProcurements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "order_item_procurements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    PurchaseUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    PurchaseStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ArrivalUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    ArrivalStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ShipmentUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    ShipmentStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_item_procurements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_item_procurements_order_items_OrderItemId",
                        column: x => x.OrderItemId,
                        principalTable: "order_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_order_item_procurements_OrderItemId",
                table: "order_item_procurements",
                column: "OrderItemId",
                unique: true,
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "order_item_procurements");
        }
    }
}
