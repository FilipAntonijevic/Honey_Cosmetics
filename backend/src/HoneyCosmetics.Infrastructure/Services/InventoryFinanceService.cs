using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

public static class InventoryFinanceService
{
    public static async Task<string?> ValidateAndApplyStockForOrderAsync(
        AppDbContext db,
        IEnumerable<(int ProductId, int Quantity)> lines,
        CancellationToken ct = default)
    {
        var grouped = lines
            .GroupBy(x => x.ProductId)
            .Select(g => (ProductId: g.Key, Quantity: g.Sum(x => x.Quantity)))
            .ToList();

        var ids = grouped.Select(x => x.ProductId).ToList();
        var products = await db.Products
            .ActiveProducts()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        foreach (var line in grouped)
        {
            if (!products.TryGetValue(line.ProductId, out var product))
                return "Jedan ili više proizvoda nije pronađen.";

            if (product.StockQuantity < line.Quantity)
            {
                return $"Nema dovoljno proizvoda na stanju: {product.Name} (dostupno {product.StockQuantity}).";
            }
        }

        foreach (var line in grouped)
        {
            products[line.ProductId].StockQuantity -= line.Quantity;
        }

        return null;
    }

    public static async Task RestoreStockForOrderAsync(
        AppDbContext db,
        Order order,
        CancellationToken ct = default)
    {
        foreach (var item in order.Items)
        {
            var product = await db.Products.FindAsync([item.ProductId], ct);
            if (product is not null)
                product.StockQuantity += item.Quantity;
        }
    }

    public static Task RecordDeliveredOrderFinanceAsync(
        AppDbContext db,
        Order order,
        CancellationToken ct = default)
    {
        if (order.FinanceRecorded)
            return Task.CompletedTask;

        var occurredAt = DateTime.UtcNow;
        var description = order.Discount > 0
            ? $"Uplata korisnika — porudžbina #{order.Id} ({order.Total:N0} RSD, popust {order.Discount:N0} RSD)"
            : $"Uplata korisnika — porudžbina #{order.Id} ({order.Total:N0} RSD)";

        db.LedgerEntries.Add(new LedgerEntry
        {
            OccurredAt = occurredAt,
            EntryType = LedgerEntryType.Income,
            Amount = order.Total,
            Description = description,
            Source = LedgerSource.OrderDelivered,
            OrderId = order.Id,
        });

        order.FinanceRecorded = true;
        return Task.CompletedTask;
    }

    public static async Task<StockReceipt> ApplyStockPurchaseAsync(
        AppDbContext db,
        Product product,
        int quantity,
        decimal unitCost,
        decimal transportUnitCost,
        decimal transportCost,
        decimal? totalMerchandiseCost,
        decimal? totalTransportCost,
        decimal? totalPurchaseCost,
        string? note,
        CancellationToken ct = default)
    {
        var merchandiseTotal = totalMerchandiseCost is > 0
            ? totalMerchandiseCost.Value
            : Math.Round(unitCost * quantity, 2);

        if (totalMerchandiseCost is > 0 && quantity > 0)
            unitCost = Math.Round(merchandiseTotal / quantity, 2);

        decimal transportTotal;
        if (totalTransportCost is > 0)
            transportTotal = totalTransportCost.Value;
        else if (transportUnitCost > 0 && quantity > 0)
            transportTotal = Math.Round(transportUnitCost * quantity, 2);
        else
            transportTotal = transportCost;

        var totalCost = totalPurchaseCost is > 0
            ? totalPurchaseCost.Value
            : Math.Round(merchandiseTotal + transportTotal, 2);

        if (transportTotal <= 0 && merchandiseTotal > 0 && totalCost > merchandiseTotal)
            transportTotal = Math.Round(totalCost - merchandiseTotal, 2);

        var receipt = new StockReceipt
        {
            ProductId = product.Id,
            Quantity = quantity,
            UnitCost = unitCost,
            TransportCost = transportTotal,
            TotalCost = totalCost,
            Note = note?.Trim(),
        };
        db.StockReceipts.Add(receipt);

        var oldQty = product.StockQuantity;
        var oldCost = product.UnitCostPrice ?? unitCost;
        product.StockQuantity += quantity;
        if (quantity > 0)
        {
            product.UnitCostPrice = oldQty + quantity > 0
                ? Math.Round((oldQty * oldCost + quantity * unitCost) / (oldQty + quantity), 2)
                : unitCost;
        }
        else if (product.UnitCostPrice is null)
        {
            product.UnitCostPrice = unitCost;
        }

        await db.SaveChangesAsync(ct);

        db.LedgerEntries.Add(new LedgerEntry
        {
            OccurredAt = DateTime.UtcNow,
            EntryType = LedgerEntryType.Expense,
            Amount = totalCost,
            Description = transportTotal > 0
                ? $"Nabavka: {product.Name} +{quantity} kom — ukupno {totalCost:N0} RSD (roba {merchandiseTotal:N0}, transport {transportTotal:N0})"
                : $"Nabavka: {product.Name} +{quantity} kom — ukupno {totalCost:N0} RSD",
            Source = LedgerSource.StockPurchase,
            ProductId = product.Id,
            StockReceiptId = receipt.Id,
        });

        await db.SaveChangesAsync(ct);
        return receipt;
    }
}
