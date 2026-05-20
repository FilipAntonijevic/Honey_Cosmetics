using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

/// <summary>
/// Aligns LedgerEntries → StockReceipts FK with the EF model (manual SQL omitted this constraint).
/// </summary>
public partial class SyncLedgerStockReceiptFk : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DO $EF$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE constraint_name = 'FK_LedgerEntries_StockReceipts_StockReceiptId'
                      AND table_name = 'LedgerEntries'
                ) THEN
                    ALTER TABLE "LedgerEntries"
                    ADD CONSTRAINT "FK_LedgerEntries_StockReceipts_StockReceiptId"
                    FOREIGN KEY ("StockReceiptId") REFERENCES "StockReceipts" ("Id");
                ELSIF EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'FK_LedgerEntries_StockReceipts_StockReceiptId'
                      AND confdeltype = 'n'
                ) THEN
                    ALTER TABLE "LedgerEntries"
                    DROP CONSTRAINT "FK_LedgerEntries_StockReceipts_StockReceiptId";

                    ALTER TABLE "LedgerEntries"
                    ADD CONSTRAINT "FK_LedgerEntries_StockReceipts_StockReceiptId"
                    FOREIGN KEY ("StockReceiptId") REFERENCES "StockReceipts" ("Id");
                END IF;
            END $EF$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            ALTER TABLE "LedgerEntries"
            DROP CONSTRAINT IF EXISTS "FK_LedgerEntries_StockReceipts_StockReceiptId";
            """);
    }
}
