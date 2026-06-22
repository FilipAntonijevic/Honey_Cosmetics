using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260622150000_AddShippingCost")]
public partial class AddShippingCost : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>(
            name: "ShippingCost",
            table: "SiteSettings",
            type: "numeric",
            nullable: false,
            defaultValue: 430m);

        migrationBuilder.AddColumn<decimal>(
            name: "ShippingCost",
            table: "Orders",
            type: "numeric",
            nullable: false,
            defaultValue: 0m);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ShippingCost",
            table: "SiteSettings");

        migrationBuilder.DropColumn(
            name: "ShippingCost",
            table: "Orders");
    }
}
