using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260527160000_AddSitePopupMobileImage")]
public partial class AddSitePopupMobileImage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "MobileImageUrl",
            table: "SitePopups",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.Sql("""
            UPDATE "SitePopups"
            SET "MobileImageUrl" = "ImageUrl"
            WHERE "MobileImageUrl" = '';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "MobileImageUrl",
            table: "SitePopups");
    }
}
