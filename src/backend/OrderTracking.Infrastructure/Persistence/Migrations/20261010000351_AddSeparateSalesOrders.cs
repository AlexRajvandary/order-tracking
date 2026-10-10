using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations;

public partial class AddSeparateSalesOrders : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameTable(name: "orders", newName: "requests");
        migrationBuilder.RenameTable(name: "order_items", newName: "request_items");
        migrationBuilder.RenameIndex(name: "IX_orders_CreatedAt", table: "requests", newName: "IX_requests_CreatedAt");
        migrationBuilder.RenameIndex(name: "IX_orders_CustomerId", table: "requests", newName: "IX_requests_CustomerId");
        migrationBuilder.RenameIndex(name: "IX_orders_CreatedByAdminId", table: "requests", newName: "IX_requests_CreatedByAdminId");
        migrationBuilder.RenameIndex(name: "IX_orders_DeliveryAddressId", table: "requests", newName: "IX_requests_DeliveryAddressId");
        migrationBuilder.RenameIndex(name: "IX_orders_TrackingCode", table: "requests", newName: "IX_requests_TrackingCode");
        migrationBuilder.RenameIndex(name: "IX_orders_UpdatedAt", table: "requests", newName: "IX_requests_UpdatedAt");
        migrationBuilder.RenameIndex(name: "IX_order_items_OrderId", table: "request_items", newName: "IX_request_items_OrderId");
        migrationBuilder.RenameIndex(name: "IX_order_items_CurrentStatusId", table: "request_items", newName: "IX_request_items_CurrentStatusId");

        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"PK_orders\" TO \"PK_requests\"");
        migrationBuilder.Sql("ALTER TABLE request_items RENAME CONSTRAINT \"PK_order_items\" TO \"PK_request_items\"");
        migrationBuilder.Sql("ALTER TABLE customer_order_claims RENAME CONSTRAINT \"FK_customer_order_claims_orders_OrderId\" TO \"FK_customer_order_claims_requests_OrderId\"");
        migrationBuilder.Sql("ALTER TABLE order_item_procurements RENAME CONSTRAINT \"FK_order_item_procurements_order_items_OrderItemId\" TO \"FK_order_item_procurements_request_items_OrderItemId\"");
        migrationBuilder.Sql("ALTER TABLE order_item_status_history RENAME CONSTRAINT \"FK_order_item_status_history_order_items_OrderItemId\" TO \"FK_order_item_status_history_request_items_OrderItemId\"");
        migrationBuilder.Sql("ALTER TABLE request_items RENAME CONSTRAINT \"FK_order_items_orders_OrderId\" TO \"FK_request_items_requests_OrderId\"");
        migrationBuilder.Sql("ALTER TABLE request_items RENAME CONSTRAINT \"FK_order_items_status_definitions_CurrentStatusId\" TO \"FK_request_items_status_definitions_CurrentStatusId\"");
        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"FK_orders_admin_users_CreatedByAdminId\" TO \"FK_requests_admin_users_CreatedByAdminId\"");
        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"FK_orders_customer_addresses_DeliveryAddressId\" TO \"FK_requests_customer_addresses_DeliveryAddressId\"");
        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"FK_orders_customers_CustomerId\" TO \"FK_requests_customers_CustomerId\"");

        migrationBuilder.AddColumn<Guid>(name: "ConvertedToSalesOrderId", table: "requests", type: "uuid", nullable: true);
        migrationBuilder.AddColumn<bool>(name: "IsSalesOrderWorkspace", table: "requests", type: "boolean", nullable: false, defaultValue: false);

        migrationBuilder.CreateTable(
            name: "orders",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                SourceRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                WorkspaceRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_orders", x => x.Id);
                table.ForeignKey("FK_orders_requests_SourceRequestId", x => x.SourceRequestId, "requests", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_orders_requests_WorkspaceRequestId", x => x.WorkspaceRequestId, "requests", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(name: "IX_orders_SourceRequestId", table: "orders", column: "SourceRequestId", unique: true, filter: "\"IsDeleted\" = false");
        migrationBuilder.CreateIndex(name: "IX_orders_WorkspaceRequestId", table: "orders", column: "WorkspaceRequestId", unique: true, filter: "\"IsDeleted\" = false");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "orders");
        migrationBuilder.DropColumn(name: "ConvertedToSalesOrderId", table: "requests");
        migrationBuilder.DropColumn(name: "IsSalesOrderWorkspace", table: "requests");

        migrationBuilder.Sql("ALTER TABLE customer_order_claims RENAME CONSTRAINT \"FK_customer_order_claims_requests_OrderId\" TO \"FK_customer_order_claims_orders_OrderId\"");
        migrationBuilder.Sql("ALTER TABLE order_item_procurements RENAME CONSTRAINT \"FK_order_item_procurements_request_items_OrderItemId\" TO \"FK_order_item_procurements_order_items_OrderItemId\"");
        migrationBuilder.Sql("ALTER TABLE order_item_status_history RENAME CONSTRAINT \"FK_order_item_status_history_request_items_OrderItemId\" TO \"FK_order_item_status_history_order_items_OrderItemId\"");
        migrationBuilder.Sql("ALTER TABLE request_items RENAME CONSTRAINT \"FK_request_items_requests_OrderId\" TO \"FK_order_items_orders_OrderId\"");
        migrationBuilder.Sql("ALTER TABLE request_items RENAME CONSTRAINT \"FK_request_items_status_definitions_CurrentStatusId\" TO \"FK_order_items_status_definitions_CurrentStatusId\"");
        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"FK_requests_admin_users_CreatedByAdminId\" TO \"FK_orders_admin_users_CreatedByAdminId\"");
        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"FK_requests_customer_addresses_DeliveryAddressId\" TO \"FK_orders_customer_addresses_DeliveryAddressId\"");
        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"FK_requests_customers_CustomerId\" TO \"FK_orders_customers_CustomerId\"");
        migrationBuilder.Sql("ALTER TABLE request_items RENAME CONSTRAINT \"PK_request_items\" TO \"PK_order_items\"");
        migrationBuilder.Sql("ALTER TABLE requests RENAME CONSTRAINT \"PK_requests\" TO \"PK_orders\"");

        migrationBuilder.RenameTable(name: "request_items", newName: "order_items");
        migrationBuilder.RenameTable(name: "requests", newName: "orders");
        migrationBuilder.RenameIndex(name: "IX_request_items_OrderId", table: "order_items", newName: "IX_order_items_OrderId");
        migrationBuilder.RenameIndex(name: "IX_request_items_CurrentStatusId", table: "order_items", newName: "IX_order_items_CurrentStatusId");
        migrationBuilder.RenameIndex(name: "IX_requests_CreatedAt", table: "orders", newName: "IX_orders_CreatedAt");
        migrationBuilder.RenameIndex(name: "IX_requests_CustomerId", table: "orders", newName: "IX_orders_CustomerId");
        migrationBuilder.RenameIndex(name: "IX_requests_CreatedByAdminId", table: "orders", newName: "IX_orders_CreatedByAdminId");
        migrationBuilder.RenameIndex(name: "IX_requests_DeliveryAddressId", table: "orders", newName: "IX_orders_DeliveryAddressId");
        migrationBuilder.RenameIndex(name: "IX_requests_TrackingCode", table: "orders", newName: "IX_orders_TrackingCode");
        migrationBuilder.RenameIndex(name: "IX_requests_UpdatedAt", table: "orders", newName: "IX_orders_UpdatedAt");
    }
}
