using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260626120000_MergeSingleVariantIntoProductName")]
public partial class MergeSingleVariantIntoProductName : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            WITH singles AS (
                SELECT
                    p."Id",
                    p."VariantLabel",
                    TRIM(regexp_replace(p."Name", '\s*[\(\-–]?\s*\d+\s*(ml|gr)\s*\)?\s*$', '', 'i')) AS base_name,
                    COUNT(*) OVER (
                        PARTITION BY COALESCE(p."VariantGroupId", p."Id")
                    ) AS sibling_count
                FROM "Products" p
                WHERE NOT p."IsDeleted"
                  AND COALESCE(TRIM(p."VariantLabel"), '') <> ''
            )
            UPDATE "Products" p
            SET
                "Name" = TRIM(s.base_name || ' ' || s."VariantLabel"),
                "VariantLabel" = NULL,
                "VariantGroupId" = NULL,
                "IsDefaultVariant" = false,
                "VariantSortOrder" = 0
            FROM singles s
            WHERE p."Id" = s."Id"
              AND s.sibling_count = 1;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Irreversible data merge.
    }
}
