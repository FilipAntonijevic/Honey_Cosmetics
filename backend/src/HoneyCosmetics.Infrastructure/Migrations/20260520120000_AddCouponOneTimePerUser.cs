using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCouponOneTimePerUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CouponUsages_CouponId_UserId",
                table: "CouponUsages");

            migrationBuilder.AddColumn<bool>(
                name: "OneTimePerUser",
                table: "Coupons",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsages_CouponId_UserId",
                table: "CouponUsages",
                columns: new[] { "CouponId", "UserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CouponUsages_CouponId_UserId",
                table: "CouponUsages");

            migrationBuilder.DropColumn(
                name: "OneTimePerUser",
                table: "Coupons");

            migrationBuilder.CreateIndex(
                name: "IX_CouponUsages_CouponId_UserId",
                table: "CouponUsages",
                columns: new[] { "CouponId", "UserId" },
                unique: true);
        }
    }
}
