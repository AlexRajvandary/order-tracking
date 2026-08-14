using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Products.Infrastructure.Persistence;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(ProductsDbContext))]
    [Migration("20260814123500_AddCrawlerJobHistoryDetails")]
    public partial class AddCrawlerJobHistoryDetails : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CategoryPath",
                table: "crawler_jobs",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "LastPage",
                table: "crawler_jobs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                """
                WITH RECURSIVE category_paths AS (
                    SELECT c."Id", c."ParentId", c."Name"::text AS path
                    FROM categories AS c
                    WHERE c."ParentId" IS NULL
                    UNION ALL
                    SELECT child."Id", child."ParentId", parent.path || ' → ' || child."Name"
                    FROM categories AS child
                    INNER JOIN category_paths AS parent ON parent."Id" = child."ParentId"
                )
                UPDATE crawler_jobs AS job
                SET "CategoryPath" = LEFT(category_paths.path, 1000),
                    "LastPage" = job."ProcessedPages"
                FROM category_paths
                WHERE category_paths."Id" = job."CategoryId";
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "CategoryPath", table: "crawler_jobs");
            migrationBuilder.DropColumn(name: "LastPage", table: "crawler_jobs");
        }
    }
}
