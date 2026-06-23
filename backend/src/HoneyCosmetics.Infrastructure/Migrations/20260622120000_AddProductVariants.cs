using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260622120000_AddProductVariants")]
public partial class AddProductVariants : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "VariantGroupId",
            table: "Products",
            type: "integer",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "VariantLabel",
            table: "Products",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "VariantSortOrder",
            table: "Products",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "VariantLabel",
            table: "OrderItems",
            type: "text",
            nullable: true);

        migrationBuilder.DropIndex(
            name: "IX_Products_Name",
            table: "Products");

        migrationBuilder.CreateIndex(
            name: "IX_Products_Name",
            table: "Products",
            column: "Name",
            unique: true,
            filter: "\"VariantGroupId\" IS NULL");

        migrationBuilder.CreateIndex(
            name: "IX_Products_VariantGroupId_VariantLabel",
            table: "Products",
            columns: new[] { "VariantGroupId", "VariantLabel" },
            unique: true,
            filter: "\"VariantGroupId\" IS NOT NULL AND \"VariantLabel\" IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_Products_VariantGroupId",
            table: "Products",
            column: "VariantGroupId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Products_VariantGroupId",
            table: "Products");

        migrationBuilder.DropIndex(
            name: "IX_Products_VariantGroupId_VariantLabel",
            table: "Products");

        migrationBuilder.DropIndex(
            name: "IX_Products_Name",
            table: "Products");

        migrationBuilder.DropColumn(
            name: "VariantGroupId",
            table: "Products");

        migrationBuilder.DropColumn(
            name: "VariantLabel",
            table: "Products");

        migrationBuilder.DropColumn(
            name: "VariantSortOrder",
            table: "Products");

        migrationBuilder.DropColumn(
            name: "VariantLabel",
            table: "OrderItems");

        migrationBuilder.CreateIndex(
            name: "IX_Products_Name",
            table: "Products",
            column: "Name",
            unique: true);
    }
}
