using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

/// <summary>
/// Svaki Color Polish dobija dve gramaze: 15ml (postojeca cena i stanje) i 8ml (750, stanje 0).
/// Naziv se ciscen od " 15ml" jer gramaza od tada zivi u VariantLabel.
/// </summary>
[DbContext(typeof(AppDbContext))]
[Migration("20260810120000_AddEightMlOptionToColorPolish")]
public partial class AddEightMlOptionToColorPolish : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // 1) Samostalan "Color Polish CXX 15ml" postaje anchor grupe varijanti sa gramazom 15ml.
        //    Cena i stanje se ne diraju. Naziv i VariantGroupId se menjaju istom komandom, da red
        //    izadje iz parcijalnog unique indeksa na Name (filter: VariantGroupId IS NULL).
        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "Name" = regexp_replace("Name", '\s*15ml$', ''),
                "VariantLabel" = '15ml',
                "VariantGroupId" = "Id",
                "VariantSortOrder" = 10,
                "IsDefaultVariant" = true
            WHERE "IsDeleted" = false
              AND "Name" ~ '^Color Polish C[0-9]+ 15ml$';
            """);

        // 2) Uparen soft-deleted red (ostatak ranijeg seed-a, cena 750, bez referenci u
        //    porudzbinama/korpama/nabavkama) ozivljava se kao gramaza 8ml sa stanjem 0.
        //    Zajednicka polja se prepisuju sa anchora — time se popravlja i ImageUrl kod
        //    nekoliko redova koji su pokazivali na fajlove kojih vise nema na disku.
        migrationBuilder.Sql(
            """
            UPDATE "Products" d
            SET "IsDeleted" = false,
                "DeletedAt" = NULL,
                "VariantLabel" = '8ml',
                "VariantGroupId" = a."Id",
                "VariantSortOrder" = 20,
                "IsDefaultVariant" = false,
                "Price" = 750,
                "StockQuantity" = 0,
                "OrderedQuantity" = 0,
                "Description" = a."Description",
                "ImageUrl" = a."ImageUrl",
                "ProductTypeId" = a."ProductTypeId",
                "CategoryId" = a."CategoryId"
            FROM "Products" a
            WHERE a."IsDeleted" = false
              AND a."VariantLabel" = '15ml'
              AND a."VariantGroupId" = a."Id"
              AND a."Name" ~ '^Color Polish C[0-9]+$'
              AND d."IsDeleted" = true
              AND d."Name" = a."Name"
              -- Ako bi slucajno bilo vise obrisanih redova istog imena, ozivi samo jedan.
              AND d."Id" = (
                  SELECT MIN(x."Id") FROM "Products" x
                  WHERE x."IsDeleted" = true AND x."Name" = a."Name")
              -- Grupe koje vec imaju aktivnu 8ml opciju se preskacu (cuva unique indeks).
              AND NOT EXISTS (
                  SELECT 1 FROM "Products" s
                  WHERE s."IsDeleted" = false
                    AND s."VariantGroupId" = a."Id"
                    AND s."VariantLabel" = '8ml');
            """);

        // 3) Galerija mora biti ista bez obzira na izabranu gramazu. Stara galerija 8ml reda se
        //    odbacuje jer kod nekih boja pokazuje na fajlove kojih vise nema na disku, pa se
        //    kompletno preslikava sa anchora.
        migrationBuilder.Sql(
            """
            DELETE FROM "ProductImages"
            WHERE "ProductId" IN (
                SELECT d."Id" FROM "Products" d
                WHERE d."IsDeleted" = false
                  AND d."VariantLabel" = '8ml'
                  AND d."VariantGroupId" IS NOT NULL
                  AND d."Name" ~ '^Color Polish C[0-9]+$');
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
              AND d."VariantLabel" = '8ml'
              AND d."Name" ~ '^Color Polish C[0-9]+$';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Migracija podataka — vracanje ide iz dumpa baze, ne iz Down().
    }
}
