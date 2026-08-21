using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

/// <summary>
/// Oznaka za grame postaje "g" umesto "gr". Base Coat i Clear Rubber Base prelaze sa
/// ml na grame (38g/15g), a Hard Gelovi koji su imali samo vecu gramazu dobijaju i 15g.
/// </summary>
[DbContext(typeof(AppDbContext))]
[Migration("20260810140000_SwitchGramLabelsAndGelOptions")]
public partial class SwitchGramLabelsAndGelOptions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // 1) Sve postojece "gr" oznake postaju "g" — i na proizvodima i na snimljenim
        //    stavkama porudzbina, da stare porudzbine u adminu citaju isto kao katalog.
        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "VariantLabel" = regexp_replace("VariantLabel", '^([0-9]+)\s*gr$', '\1g', 'i')
            WHERE "VariantLabel" ~* '^[0-9]+\s*gr$';
            """);

        migrationBuilder.Sql(
            """
            UPDATE "OrderItems"
            SET "VariantLabel" = regexp_replace("VariantLabel", '^([0-9]+)\s*gr$', '\1g', 'i')
            WHERE "VariantLabel" ~* '^[0-9]+\s*gr$';
            """);

        // 2) Base Coat i Clear Rubber Base se prodaju u gramima, ne u mililitrima.
        //    Menja se samo tekst oznake — cena, stanje, podrazumevana opcija i redosled ostaju.
        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "VariantLabel" = CASE "VariantLabel"
                                     WHEN '15ml' THEN '38g'
                                     WHEN '8ml' THEN '15g'
                                 END
            WHERE "IsDeleted" = false
              AND "Name" IN ('Base Coat', 'Clear Rubber Base')
              AND "VariantLabel" IN ('15ml', '8ml');
            """);

        // 3) Opis Base Coat-a je jos pominjao pakovanje od 15 ml, sto sada protivreci oznakama.
        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "Description" = regexp_replace("Description", '\s*\n\s*Pakovanje:\s*15\s*ml\.?\s*$', '', 'i')
            WHERE "Name" = 'Base Coat'
              AND "Description" ~* 'Pakovanje:\s*15\s*ml';
            """);

        // 4) Hard Gelovi koji imaju samo vecu gramazu (i to zalepljenu u naziv) postaju
        //    grupa varijanti sa oznakom 38g. Radi se samo ako postoji uparen uspavan red
        //    koji moze da postane 15g.
        migrationBuilder.Sql(
            """
            UPDATE "Products" a
            SET "Name" = TRIM(regexp_replace(a."Name", '\s*38\s*g$', '', 'i')),
                "VariantLabel" = '38g',
                "VariantGroupId" = a."Id",
                "VariantSortOrder" = 20,
                "IsDefaultVariant" = true
            WHERE a."IsDeleted" = false
              AND a."VariantGroupId" IS NULL
              AND a."Name" ~* '^(Clear )?Hard Gel H[0-9]+ 38\s*g$'
              AND EXISTS (
                  SELECT 1 FROM "Products" d
                  WHERE d."IsDeleted" = true
                    AND d."Name" = TRIM(regexp_replace(a."Name", '\s*38\s*g$', '', 'i')));
            """);

        // 5) Uparen uspavan red ozivljava se kao 15g sa stanjem 0. Cena mu se ne dira jer
        //    je vec tacna (1350 za Hard Gel, 1250 za Clear Hard Gel).
        migrationBuilder.Sql(
            """
            UPDATE "Products" d
            SET "IsDeleted" = false,
                "DeletedAt" = NULL,
                "VariantLabel" = '15g',
                "VariantGroupId" = a."Id",
                "VariantSortOrder" = 10,
                "IsDefaultVariant" = false,
                "StockQuantity" = 0,
                "OrderedQuantity" = 0,
                "Description" = a."Description",
                "ImageUrl" = a."ImageUrl",
                "ProductTypeId" = a."ProductTypeId",
                "CategoryId" = a."CategoryId"
            FROM "Products" a
            WHERE a."IsDeleted" = false
              AND a."VariantLabel" = '38g'
              AND a."VariantGroupId" = a."Id"
              AND a."Name" ~* '^(Clear )?Hard Gel H[0-9]+$'
              AND d."IsDeleted" = true
              AND d."Name" = a."Name"
              AND d."Id" = (
                  SELECT MIN(x."Id") FROM "Products" x
                  WHERE x."IsDeleted" = true AND x."Name" = a."Name")
              AND NOT EXISTS (
                  SELECT 1 FROM "Products" s
                  WHERE s."IsDeleted" = false
                    AND s."VariantGroupId" = a."Id"
                    AND s."VariantLabel" = '15g');
            """);

        // 6) Galerija ozivljenog reda se preslikava sa anchora. Uslov d."Id" <> d."VariantGroupId"
        //    stiti gelove kod kojih je bas 15g red anchor grupe (H02, H04, H05, H08) — njihova
        //    galerija se ne dira.
        migrationBuilder.Sql(
            """
            DELETE FROM "ProductImages"
            WHERE "ProductId" IN (
                SELECT d."Id" FROM "Products" d
                WHERE d."IsDeleted" = false
                  AND d."VariantLabel" = '15g'
                  AND d."VariantGroupId" IS NOT NULL
                  AND d."Id" <> d."VariantGroupId"
                  AND d."Name" ~* '^(Clear )?Hard Gel H[0-9]+$');
            """);

        migrationBuilder.Sql(
            """
            INSERT INTO "ProductImages" ("ProductId", "ImageUrl", "SortOrder")
            SELECT d."Id", pi."ImageUrl", pi."SortOrder"
            FROM "Products" d
            JOIN "Products" a
              ON a."Id" = d."VariantGroupId" AND a."IsDeleted" = false
            JOIN "ProductImages" pi ON pi."ProductId" = a."Id"
            WHERE d."IsDeleted" = false
              AND d."VariantLabel" = '15g'
              AND d."Id" <> d."VariantGroupId"
              AND d."Name" ~* '^(Clear )?Hard Gel H[0-9]+$';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Migracija podataka — vracanje ide iz dumpa baze, ne iz Down().
    }
}
