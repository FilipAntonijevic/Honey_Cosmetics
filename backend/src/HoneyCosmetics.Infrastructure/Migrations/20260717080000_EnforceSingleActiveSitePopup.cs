using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

public partial class EnforceSingleActiveSitePopup : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            WITH ranked AS (
                SELECT "Id", ROW_NUMBER() OVER (ORDER BY "CreatedAt" DESC, "Id" DESC) AS rn
                FROM "SitePopups"
                WHERE "IsActive" = true
            )
            UPDATE "SitePopups" AS p
            SET "IsActive" = false
            FROM ranked
            WHERE p."Id" = ranked."Id" AND ranked.rn > 1;
            """);

        migrationBuilder.DropIndex(
            name: "IX_SitePopups_IsActive",
            table: "SitePopups");

        migrationBuilder.CreateIndex(
            name: "IX_SitePopups_IsActive",
            table: "SitePopups",
            column: "IsActive",
            unique: true,
            filter: "\"IsActive\" = true");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_SitePopups_IsActive",
            table: "SitePopups");

        migrationBuilder.CreateIndex(
            name: "IX_SitePopups_IsActive",
            table: "SitePopups",
            column: "IsActive");
    }
}
