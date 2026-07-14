using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAttachmentUploaderMeta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UploadedAt",
                table: "order_item_status_attachments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UploadedByAdminId",
                table: "order_item_status_attachments",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE order_item_status_attachments AS a
                SET "UploadedByAdminId" = h."ChangedByAdminId",
                    "UploadedAt" = h."ChangedAt"
                FROM order_item_status_history AS h
                WHERE a."StatusHistoryId" = h."Id";
                """);

            migrationBuilder.Sql(
                """
                UPDATE order_item_status_attachments
                SET "UploadedAt" = NOW()
                WHERE "UploadedAt" IS NULL;
                """);

            migrationBuilder.Sql(
                """
                UPDATE order_item_status_attachments
                SET "UploadedByAdminId" = (
                    SELECT "Id" FROM admin_users WHERE "IsDeleted" = false ORDER BY "CreatedAt" LIMIT 1
                )
                WHERE "UploadedByAdminId" IS NULL;
                """);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "UploadedAt",
                table: "order_item_status_attachments",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "UploadedByAdminId",
                table: "order_item_status_attachments",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_order_item_status_attachments_UploadedByAdminId",
                table: "order_item_status_attachments",
                column: "UploadedByAdminId");

            migrationBuilder.AddForeignKey(
                name: "FK_order_item_status_attachments_admin_users_UploadedByAdminId",
                table: "order_item_status_attachments",
                column: "UploadedByAdminId",
                principalTable: "admin_users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_order_item_status_attachments_admin_users_UploadedByAdminId",
                table: "order_item_status_attachments");

            migrationBuilder.DropIndex(
                name: "IX_order_item_status_attachments_UploadedByAdminId",
                table: "order_item_status_attachments");

            migrationBuilder.DropColumn(
                name: "UploadedAt",
                table: "order_item_status_attachments");

            migrationBuilder.DropColumn(
                name: "UploadedByAdminId",
                table: "order_item_status_attachments");
        }
    }
}
