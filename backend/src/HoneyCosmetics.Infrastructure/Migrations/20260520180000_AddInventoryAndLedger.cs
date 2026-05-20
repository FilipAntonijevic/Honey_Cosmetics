using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

public partial class AddInventoryAndLedger : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>(
            name: "UnitCostPrice",
            table: "Products",
            type: "numeric",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "StockQuantity",
            table: "Products",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<bool>(
            name: "FinanceRecorded",
            table: "Orders",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.CreateTable(
            name: "StockReceipts",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                ProductId = table.Column<int>(type: "integer", nullable: false),
                Quantity = table.Column<int>(type: "integer", nullable: false),
                UnitCost = table.Column<decimal>(type: "numeric", nullable: false),
                TransportCost = table.Column<decimal>(type: "numeric", nullable: false),
                TotalCost = table.Column<decimal>(type: "numeric", nullable: false),
                Note = table.Column<string>(type: "text", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StockReceipts", x => x.Id);
                table.ForeignKey(
                    name: "FK_StockReceipts_Products_ProductId",
                    column: x => x.ProductId,
                    principalTable: "Products",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "LedgerEntries",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                EntryType = table.Column<int>(type: "integer", nullable: false),
                Amount = table.Column<decimal>(type: "numeric", nullable: false),
                Description = table.Column<string>(type: "text", nullable: false),
                Source = table.Column<int>(type: "integer", nullable: false),
                OrderId = table.Column<int>(type: "integer", nullable: true),
                ProductId = table.Column<int>(type: "integer", nullable: true),
                StockReceiptId = table.Column<int>(type: "integer", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_LedgerEntries", x => x.Id);
                table.ForeignKey(
                    name: "FK_LedgerEntries_Orders_OrderId",
                    column: x => x.OrderId,
                    principalTable: "Orders",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_LedgerEntries_Products_ProductId",
                    column: x => x.ProductId,
                    principalTable: "Products",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_LedgerEntries_StockReceipts_StockReceiptId",
                    column: x => x.StockReceiptId,
                    principalTable: "StockReceipts",
                    principalColumn: "Id");
            });

        migrationBuilder.CreateIndex(
            name: "IX_LedgerEntries_OccurredAt",
            table: "LedgerEntries",
            column: "OccurredAt");

        migrationBuilder.CreateIndex(
            name: "IX_LedgerEntries_OrderId",
            table: "LedgerEntries",
            column: "OrderId");

        migrationBuilder.CreateIndex(
            name: "IX_LedgerEntries_ProductId",
            table: "LedgerEntries",
            column: "ProductId");

        migrationBuilder.CreateIndex(
            name: "IX_StockReceipts_ProductId",
            table: "StockReceipts",
            column: "ProductId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "LedgerEntries");
        migrationBuilder.DropTable(name: "StockReceipts");
        migrationBuilder.DropColumn(name: "FinanceRecorded", table: "Orders");
        migrationBuilder.DropColumn(name: "StockQuantity", table: "Products");
        migrationBuilder.DropColumn(name: "UnitCostPrice", table: "Products");
    }
}
