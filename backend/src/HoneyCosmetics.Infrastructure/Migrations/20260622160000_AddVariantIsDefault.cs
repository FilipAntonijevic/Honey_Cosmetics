using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260622160000_AddVariantIsDefault")]
public partial class AddVariantIsDefault : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsDefaultVariant",
            table: "Products",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        // Backfill: exactly one default per variant group.
        // Prefer 15ml/15gr, then lowest sort order, then lowest id.
        migrationBuilder.Sql(@"
            WITH grp AS (
                SELECT
                    ""Id"",
                    COALESCE(""VariantGroupId"", ""Id"") AS gid,
                    CASE WHEN lower(""VariantLabel"") IN ('15ml','15gr') THEN 0 ELSE 1 END AS pref,
                    ""VariantSortOrder"" AS sortord
                FROM ""Products""
                WHERE ""IsDeleted"" = false
            ),
            ranked AS (
                SELECT
                    ""Id"",
                    ROW_NUMBER() OVER (PARTITION BY gid ORDER BY pref ASC, sortord ASC, ""Id"" ASC) AS rn
                FROM grp
            )
            UPDATE ""Products"" p
            SET ""IsDefaultVariant"" = (r.rn = 1)
            FROM ranked r
            WHERE r.""Id"" = p.""Id"";
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "IsDefaultVariant",
            table: "Products");
    }
}
