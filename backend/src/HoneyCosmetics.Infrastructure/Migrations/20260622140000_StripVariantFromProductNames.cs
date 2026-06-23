using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260622140000_StripVariantFromProductNames")]
public partial class StripVariantFromProductNames : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "VariantLabel" = LOWER(
                (regexp_match("Name", '(\d+)\s*(ml|gr)', 'i'))[1]
                || (regexp_match("Name", '(\d+)\s*(ml|gr)', 'i'))[2]
            )
            WHERE COALESCE(TRIM("VariantLabel"), '') = ''
              AND "Name" ~* '\d+\s*(ml|gr)';
            """);

        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "Name" = TRIM(regexp_replace("Name", '\s*[\(\-–]?\s*\d+\s*(ml|gr)\s*\)?\s*$', '', 'i'))
            WHERE "Name" ~* '\d+\s*(ml|gr)';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Irreversible data cleanup.
    }
}
