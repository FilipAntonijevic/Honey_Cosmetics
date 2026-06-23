using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260615120000_AddCustomerImportedStats")]
public partial class AddCustomerImportedStats : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "ImportedOrderCount",
            table: "CustomerProfiles",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<decimal>(
            name: "ImportedTotalSpent",
            table: "CustomerProfiles",
            type: "numeric",
            nullable: false,
            defaultValue: 0m);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ImportedOrderCount",
            table: "CustomerProfiles");

        migrationBuilder.DropColumn(
            name: "ImportedTotalSpent",
            table: "CustomerProfiles");
    }
}
