using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

public partial class OrderCheckoutAndIndexFixes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "CustomerNote",
            table: "Orders",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "InstagramHandle",
            table: "Orders",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "IdempotencyKey",
            table: "Orders",
            type: "text",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Orders_IdempotencyKey",
            table: "Orders",
            column: "IdempotencyKey",
            unique: true,
            filter: "\"IdempotencyKey\" IS NOT NULL");

        migrationBuilder.DropIndex(
            name: "IX_Products_Name",
            table: "Products");

        migrationBuilder.CreateIndex(
            name: "IX_Products_Name",
            table: "Products",
            column: "Name",
            unique: true,
            filter: "\"VariantGroupId\" IS NULL AND \"IsDeleted\" = false");

        migrationBuilder.DropIndex(
            name: "IX_CouponUsages_CouponId_UserId",
            table: "CouponUsages");

        migrationBuilder.CreateIndex(
            name: "IX_CouponUsages_CouponId_UserId",
            table: "CouponUsages",
            columns: new[] { "CouponId", "UserId" },
            unique: true,
            filter: "\"UserId\" IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_CouponUsages_CouponId_UserId",
            table: "CouponUsages");

        migrationBuilder.CreateIndex(
            name: "IX_CouponUsages_CouponId_UserId",
            table: "CouponUsages",
            columns: new[] { "CouponId", "UserId" });

        migrationBuilder.DropIndex(
            name: "IX_Products_Name",
            table: "Products");

        migrationBuilder.CreateIndex(
            name: "IX_Products_Name",
            table: "Products",
            column: "Name",
            unique: true,
            filter: "\"VariantGroupId\" IS NULL");

        migrationBuilder.DropIndex(
            name: "IX_Orders_IdempotencyKey",
            table: "Orders");

        migrationBuilder.DropColumn(
            name: "IdempotencyKey",
            table: "Orders");

        migrationBuilder.DropColumn(
            name: "InstagramHandle",
            table: "Orders");

        migrationBuilder.DropColumn(
            name: "CustomerNote",
            table: "Orders");
    }
}
