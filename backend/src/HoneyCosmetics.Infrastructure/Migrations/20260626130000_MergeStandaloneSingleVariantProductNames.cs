using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260626130000_MergeStandaloneSingleVariantProductNames")]
public partial class MergeStandaloneSingleVariantProductNames : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Single-option variant groups that still have a label (idempotent with prior migration).
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

        // Standalone rows: merge gramaza from description when present.
        migrationBuilder.Sql(
            """
            UPDATE "Products" p
            SET "Name" = TRIM(
                regexp_replace(p."Name", '\s*[\(\-–]?\s*\d+\s*(ml|gr)\s*\)?\s*$', '', 'i')
                || ' '
                || LOWER(
                    COALESCE(
                        (regexp_match(p."Description", 'Pakovanje:\s*(\d+)\s*(ml|gr)', 'i'))[1]
                        || (regexp_match(p."Description", 'Pakovanje:\s*(\d+)\s*(ml|gr)', 'i'))[2],
                        (regexp_match(p."Description", '(\d+)\s*(ml|gr)', 'i'))[1]
                        || (regexp_match(p."Description", '(\d+)\s*(ml|gr)', 'i'))[2]
                    )
                )
            )
            WHERE NOT p."IsDeleted"
              AND p."VariantGroupId" IS NULL
              AND COALESCE(TRIM(p."VariantLabel"), '') = ''
              AND p."Name" !~* '\d+\s*(ml|gr)\s*$'
              AND p."Description" ~* '(\d+)\s*(ml|gr)'
              AND p."ProductTypeId" IN (
                  SELECT "Id" FROM "ProductTypes" WHERE "Name" <> 'Alati za manikir'
              );
            """);

        // BIAB (single 15ml bottle option).
        migrationBuilder.Sql(
            """
            UPDATE "Products" p
            SET "Name" = TRIM(p."Name" || ' 15ml')
            FROM "Categories" c
            WHERE p."CategoryId" = c."Id"
              AND c."Name" = 'BIAB'
              AND NOT p."IsDeleted"
              AND p."VariantGroupId" IS NULL
              AND COALESCE(TRIM(p."VariantLabel"), '') = ''
              AND p."Name" !~* '\d+\s*(ml|gr)\s*$';
            """);

        // Jelly Gel jars (single 15gr option, same convention as Hard Gel).
        migrationBuilder.Sql(
            """
            UPDATE "Products" p
            SET "Name" = TRIM(p."Name" || ' 15gr')
            FROM "Categories" c
            WHERE p."CategoryId" = c."Id"
              AND c."Name" = 'Jelly Gel'
              AND NOT p."IsDeleted"
              AND p."VariantGroupId" IS NULL
              AND COALESCE(TRIM(p."VariantLabel"), '') = ''
              AND p."Name" !~* '\d+\s*(ml|gr)\s*$';
            """);

        // Remaining Baze without gramaza in name (e.g. Rubber Cover colors).
        migrationBuilder.Sql(
            """
            UPDATE "Products" p
            SET "Name" = TRIM(p."Name" || ' 15ml')
            FROM "ProductTypes" pt
            WHERE p."ProductTypeId" = pt."Id"
              AND pt."Name" = 'Baze'
              AND NOT p."IsDeleted"
              AND p."VariantGroupId" IS NULL
              AND COALESCE(TRIM(p."VariantLabel"), '') = ''
              AND p."Name" !~* '\d+\s*(ml|gr)\s*$';
            """);

        // Remaining Top Coat rows (safety net if description lacked Pakovanje).
        migrationBuilder.Sql(
            """
            UPDATE "Products" p
            SET "Name" = TRIM(p."Name" || ' 15ml')
            FROM "ProductTypes" pt
            WHERE p."ProductTypeId" = pt."Id"
              AND pt."Name" = 'Top Coat'
              AND NOT p."IsDeleted"
              AND p."VariantGroupId" IS NULL
              AND COALESCE(TRIM(p."VariantLabel"), '') = ''
              AND p."Name" !~* '\d+\s*(ml|gr)\s*$';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Irreversible data merge.
    }
}
