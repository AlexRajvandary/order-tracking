using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using OrderTracking.Infrastructure.Persistence;

#nullable disable

namespace OrderTracking.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261017174500_UnifyRequestAndOrderTrackingCodes")]
public partial class UnifyRequestAndOrderTrackingCodes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_requests_TrackingCode",
            table: "requests");

        migrationBuilder.Sql("""
            UPDATE requests AS workspace
            SET "TrackingCode" = source."TrackingCode"
            FROM orders AS sales_order
            INNER JOIN requests AS source ON source."Id" = sales_order."SourceRequestId"
            WHERE workspace."Id" = sales_order."WorkspaceRequestId"
              AND workspace."IsSalesOrderWorkspace" = true;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_requests_TrackingCode",
            table: "requests",
            column: "TrackingCode",
            unique: true,
            filter: "\"IsDeleted\" = false AND \"IsSalesOrderWorkspace\" = false");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_requests_TrackingCode",
            table: "requests");

        migrationBuilder.Sql("""
            DO $$
            DECLARE
                workspace_row RECORD;
                candidate_code character(5);
            BEGIN
                FOR workspace_row IN
                    SELECT "Id" FROM requests
                    WHERE "IsSalesOrderWorkspace" = true AND "IsDeleted" = false
                LOOP
                    LOOP
                        candidate_code := upper(substr(md5(random()::text || clock_timestamp()::text || workspace_row."Id"::text), 1, 5));
                        EXIT WHEN NOT EXISTS (
                            SELECT 1 FROM requests existing
                            WHERE existing."TrackingCode" = candidate_code
                              AND existing."Id" <> workspace_row."Id"
                              AND existing."IsDeleted" = false
                        );
                    END LOOP;

                    UPDATE requests
                    SET "TrackingCode" = candidate_code
                    WHERE "Id" = workspace_row."Id";
                END LOOP;
            END $$;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_requests_TrackingCode",
            table: "requests",
            column: "TrackingCode",
            unique: true,
            filter: "\"IsDeleted\" = false");
    }
}
