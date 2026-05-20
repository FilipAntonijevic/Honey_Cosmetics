using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260520200000_AddProductOrderedQuantity")]
public partial class AddProductOrderedQuantity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "OrderedQuantity",
            table: "Products",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<DateTime>(
            name: "ReceivedAt",
            table: "StockReceipts",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.Sql(
            """
            UPDATE "StockReceipts"
            SET "ReceivedAt" = "CreatedAt"
            WHERE "ReceivedAt" IS NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ReceivedAt",
            table: "StockReceipts");

        migrationBuilder.DropColumn(
            name: "OrderedQuantity",
            table: "Products");
    }
}
