using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

/// <summary>
/// Top Coat, SUPER WHITE i SUPER BLACK dobijaju gramazu 8ml pored postojece 15ml.
/// Za SUPER WHITE/BLACK cene su preuzete sa uspavanih redova iz uvoza od 22.06.2026 (790 i 770),
/// dok Top Coat nikada nije imao manju gramazu pa se cena poravnava sa Top Coat Brilliant-om.
/// </summary>
[DbContext(typeof(AppDbContext))]
[Migration("20260810160000_AddEightMlOptionToTopCoatAndSuper")]
public partial class AddEightMlOptionToTopCoatAndSuper : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // 1) Samostalan red postaje anchor grupe varijanti sa gramazom 15ml. Gramaza od sada
        //    zivi u VariantLabel, pa se cisti iz naziva. Cena i stanje se ne diraju.
        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "Name" = regexp_replace("Name", '\s*15ml$', ''),
                "VariantLabel" = '15ml',
                "VariantGroupId" = "Id",
                "VariantSortOrder" = 10,
                "IsDefaultVariant" = true
            WHERE "IsDeleted" = false
              AND "VariantGroupId" IS NULL
              AND "Name" IN ('Top Coat 15ml', 'SUPER WHITE 15ml', 'SUPER BLACK 15ml');
            """);

        // 2) SUPER WHITE i SUPER BLACK imaju uparen uspavan red iz istog uvoza kao Color Polish
        //    (bez ijedne prodaje, nabavke ili knjizenja), pa se on ozivljava kao gramaza 8ml.
        //    Stanje ide na 0 jer za manje bocice nikada nije uneto stvarno stanje.
        migrationBuilder.Sql(
            """
            UPDATE "Products" d
            SET "IsDeleted" = false,
                "DeletedAt" = NULL,
                "VariantLabel" = '8ml',
                "VariantGroupId" = a."Id",
                "VariantSortOrder" = 20,
                "IsDefaultVariant" = false,
                "Price" = CASE a."Name" WHEN 'SUPER WHITE' THEN 790 ELSE 770 END,
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
              AND a."Name" IN ('SUPER WHITE', 'SUPER BLACK')
              AND d."IsDeleted" = true
              AND d."Name" = a."Name"
              -- Ako bi slucajno bilo vise obrisanih redova istog imena, ozivi samo jedan.
              AND d."Id" = (
                  SELECT MIN(x."Id") FROM "Products" x
                  WHERE x."IsDeleted" = true AND x."Name" = a."Name")
              AND NOT EXISTS (
                  SELECT 1 FROM "Products" s
                  WHERE s."IsDeleted" = false
                    AND s."VariantGroupId" = a."Id"
                    AND s."VariantLabel" = '8ml');
            """);

        // 3) Top Coat nema uspavan red koji bi se ozivio — manja gramaza mu nikada nije ni
        //    postojala — pa se pravi nov red preslikan sa anchora.
        migrationBuilder.Sql(
            """
            INSERT INTO "Products" (
                "Name", "Description", "Price", "ImageUrl", "ProductTypeId", "CategoryId",
                "CreatedAt", "BestsellerSortOrder", "IsBestseller", "UnitCostPrice",
                "StockQuantity", "IsDeleted", "OrderedQuantity", "UnitTransportCost",
                "VariantGroupId", "VariantLabel", "VariantSortOrder", "IsDefaultVariant")
            SELECT a."Name", a."Description", 1090, a."ImageUrl", a."ProductTypeId", a."CategoryId",
                   now(), 0, false, a."UnitCostPrice",
                   0, false, 0, a."UnitTransportCost",
                   a."Id", '8ml', 20, false
            FROM "Products" a
            WHERE a."IsDeleted" = false
              AND a."Name" = 'Top Coat'
              AND a."VariantLabel" = '15ml'
              AND a."VariantGroupId" = a."Id"
              AND NOT EXISTS (
                  SELECT 1 FROM "Products" s
                  WHERE s."IsDeleted" = false
                    AND s."VariantGroupId" = a."Id"
                    AND s."VariantLabel" = '8ml');
            """);

        // 4) Galerija mora biti ista bez obzira na izabranu gramazu, pa se u celosti preslikava
        //    sa anchora — stara galerija ozivljenih redova se odbacuje.
        migrationBuilder.Sql(
            """
            DELETE FROM "ProductImages"
            WHERE "ProductId" IN (
                SELECT d."Id" FROM "Products" d
                WHERE d."IsDeleted" = false
                  AND d."VariantLabel" = '8ml'
                  AND d."VariantGroupId" IS NOT NULL
                  AND d."VariantGroupId" <> d."Id"
                  AND d."Name" IN ('Top Coat', 'SUPER WHITE', 'SUPER BLACK'));
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
              AND d."VariantGroupId" <> d."Id"
              AND d."Name" IN ('Top Coat', 'SUPER WHITE', 'SUPER BLACK');
            """);

        // 5) Opis top coat-ova je jos pominjao pakovanje od 15 ml, sto sada protivreci oznakama.
        //    Colored Top Coat se ne dira jer i dalje ima samo jednu gramazu.
        migrationBuilder.Sql(
            """
            UPDATE "Products"
            SET "Description" = regexp_replace("Description", '\s*\n\s*Pakovanje:\s*15\s*ml\.?\s*$', '', 'i')
            WHERE "Name" IN ('Top Coat', 'Top Coat Brilliant')
              AND "Description" ~* 'Pakovanje:\s*15\s*ml';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Migracija podataka — vracanje ide iz dumpa baze, ne iz Down().
    }
}
