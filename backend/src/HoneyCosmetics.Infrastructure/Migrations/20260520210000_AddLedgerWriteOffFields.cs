using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260520210000_AddLedgerWriteOffFields")]
public partial class AddLedgerWriteOffFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "WriteOffQuantity",
            table: "LedgerEntries",
            type: "integer",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "WriteOffNote",
            table: "LedgerEntries",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "WriteOffNote",
            table: "LedgerEntries");

        migrationBuilder.DropColumn(
            name: "WriteOffQuantity",
            table: "LedgerEntries");
    }
}
