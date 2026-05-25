using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260520230000_AddFreeShippingSettings")]
public partial class AddFreeShippingSettings : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "FreeShippingApplied",
            table: "Orders",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<decimal>(
            name: "FreeShippingThreshold",
            table: "SiteSettings",
            type: "numeric",
            nullable: false,
            defaultValue: 10000m);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "FreeShippingApplied",
            table: "Orders");

        migrationBuilder.DropColumn(
            name: "FreeShippingThreshold",
            table: "SiteSettings");
    }
}
