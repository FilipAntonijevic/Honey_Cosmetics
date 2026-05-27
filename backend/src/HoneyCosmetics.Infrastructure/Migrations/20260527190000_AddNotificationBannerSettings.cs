using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260527190000_AddNotificationBannerSettings")]
public partial class AddNotificationBannerSettings : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "NotificationBannerEnabled",
            table: "SiteSettings",
            type: "boolean",
            nullable: false,
            defaultValue: true);

        migrationBuilder.AddColumn<string>(
            name: "NotificationBannerText",
            table: "SiteSettings",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.Sql("""
            UPDATE "SiteSettings"
            SET "NotificationBannerText" = 'Besplatna dostava za porudžbinu preko 10.000 RSD • Popust na prvu porudžbinu 10% uz kod FIRSTORDER'
            WHERE "NotificationBannerText" = '';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "NotificationBannerEnabled",
            table: "SiteSettings");

        migrationBuilder.DropColumn(
            name: "NotificationBannerText",
            table: "SiteSettings");
    }
}
