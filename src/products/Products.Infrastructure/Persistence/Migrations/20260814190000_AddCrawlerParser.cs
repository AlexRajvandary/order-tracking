using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Products.Infrastructure.Persistence;

#nullable disable

namespace Products.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(ProductsDbContext))]
    [Migration("20260814190000_AddCrawlerParser")]
    public partial class AddCrawlerParser : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Parser",
                table: "crawler_jobs",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "maketto");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Parser", table: "crawler_jobs");
        }
    }
}
