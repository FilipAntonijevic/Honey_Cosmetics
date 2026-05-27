using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260527200000_AddBankTransferTemplate")]
public partial class AddBankTransferTemplate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "BankTransferAccountNumber",
            table: "SiteSettings",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "BankTransferBankName",
            table: "SiteSettings",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "BankTransferPurpose",
            table: "SiteSettings",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "BankTransferRecipientAddress",
            table: "SiteSettings",
            type: "text",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "BankTransferRecipientName",
            table: "SiteSettings",
            type: "text",
            nullable: false,
            defaultValue: "");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "BankTransferAccountNumber", table: "SiteSettings");
        migrationBuilder.DropColumn(name: "BankTransferBankName", table: "SiteSettings");
        migrationBuilder.DropColumn(name: "BankTransferPurpose", table: "SiteSettings");
        migrationBuilder.DropColumn(name: "BankTransferRecipientAddress", table: "SiteSettings");
        migrationBuilder.DropColumn(name: "BankTransferRecipientName", table: "SiteSettings");
    }
}
