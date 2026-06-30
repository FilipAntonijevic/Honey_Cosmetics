using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using HoneyCosmetics.Infrastructure.Data;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260630120000_AddCategorySortOrder")]
public partial class AddCategorySortOrder : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "SortOrder",
            table: "Categories",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.Sql(
            """
            UPDATE "Categories" c
            SET "SortOrder" = sub.rn * 10
            FROM (
                SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "ProductTypeId" ORDER BY "Id") AS rn
                FROM "Categories"
            ) sub
            WHERE c."Id" = sub."Id";
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "SortOrder",
            table: "Categories");
    }
}
