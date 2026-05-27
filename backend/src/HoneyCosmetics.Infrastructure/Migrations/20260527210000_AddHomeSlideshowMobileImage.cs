using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260527210000_AddHomeSlideshowMobileImage")]
public partial class AddHomeSlideshowMobileImage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "MobileImageUrl",
            table: "HomeSlideshowSlides",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.Sql("""
            UPDATE "HomeSlideshowSlides"
            SET "MobileImageUrl" = "ImageUrl"
            WHERE "MobileImageUrl" = '' AND "ImageUrl" <> '';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "MobileImageUrl",
            table: "HomeSlideshowSlides");
    }
}
