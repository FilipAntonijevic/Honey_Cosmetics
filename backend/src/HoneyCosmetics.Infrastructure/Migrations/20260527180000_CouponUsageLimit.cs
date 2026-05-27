using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260527180000_CouponUsageLimit")]
public partial class CouponUsageLimit : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "UsageLimit",
            table: "Coupons",
            type: "integer",
            nullable: false,
            defaultValue: 1);

        migrationBuilder.Sql("""
            UPDATE "Coupons"
            SET "UsageLimit" = CASE
                WHEN "OneTimePerUser" = TRUE THEN 1
                WHEN "FirstOrderOnly" = TRUE THEN 1
                ELSE 0
            END;
            """);

        migrationBuilder.DropColumn(
            name: "FirstOrderOnly",
            table: "Coupons");

        migrationBuilder.DropColumn(
            name: "OneTimePerUser",
            table: "Coupons");

        migrationBuilder.AlterColumn<Guid>(
            name: "UserId",
            table: "CouponUsages",
            type: "uuid",
            nullable: true,
            oldClrType: typeof(Guid),
            oldType: "uuid");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<Guid>(
            name: "UserId",
            table: "CouponUsages",
            type: "uuid",
            nullable: false,
            defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldNullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "FirstOrderOnly",
            table: "Coupons",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<bool>(
            name: "OneTimePerUser",
            table: "Coupons",
            type: "boolean",
            nullable: false,
            defaultValue: true);

        migrationBuilder.Sql("""
            UPDATE "Coupons"
            SET "OneTimePerUser" = ("UsageLimit" = 1),
                "FirstOrderOnly" = FALSE;
            """);

        migrationBuilder.DropColumn(
            name: "UsageLimit",
            table: "Coupons");
    }
}
