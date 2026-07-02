using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSiteEmailCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "SiteSettings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InfoEmails",
                table: "SiteSettings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MarketingEmail",
                table: "SiteSettings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "OfficeEmail",
                table: "SiteSettings",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                """
                UPDATE "SiteSettings"
                SET "ContactEmail" = "EmailAddress"
                WHERE COALESCE("ContactEmail", '') = ''
                  AND COALESCE("EmailAddress", '') <> '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "InfoEmails",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "MarketingEmail",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "OfficeEmail",
                table: "SiteSettings");
        }
    }
}
