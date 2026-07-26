using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

public partial class CouponAndVariantIndexFixes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_CouponUsages_CouponId",
            table: "CouponUsages",
            column: "CouponId",
            unique: true,
            filter: "\"UserId\" IS NULL");

        migrationBuilder.DropIndex(
            name: "IX_Products_VariantGroupId_VariantLabel",
            table: "Products");

        migrationBuilder.CreateIndex(
            name: "IX_Products_VariantGroupId_VariantLabel",
            table: "Products",
            columns: new[] { "VariantGroupId", "VariantLabel" },
            unique: true,
            filter: "\"VariantGroupId\" IS NOT NULL AND \"VariantLabel\" IS NOT NULL AND \"IsDeleted\" = false");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Products_VariantGroupId_VariantLabel",
            table: "Products");

        migrationBuilder.CreateIndex(
            name: "IX_Products_VariantGroupId_VariantLabel",
            table: "Products",
            columns: new[] { "VariantGroupId", "VariantLabel" },
            unique: true,
            filter: "\"VariantGroupId\" IS NOT NULL AND \"VariantLabel\" IS NOT NULL");

        migrationBuilder.DropIndex(
            name: "IX_CouponUsages_CouponId",
            table: "CouponUsages");
    }
}
