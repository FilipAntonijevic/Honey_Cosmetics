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
        decimal? deliveryCost = null,
        CancellationToken ct = default)
    {
        if (order.FinanceRecorded)
            return Task.CompletedTask;

        if (deliveryCost is >= 0)
            order.FreeShippingDeliveryCost = deliveryCost;

        var gross = order.Total;
        var shipping = order.FreeShippingDeliveryCost ?? 0m;
        if (shipping > gross)
            shipping = gross;

        var net = gross - shipping;
        var description = BuildDeliveredOrderDescription(order.Id, gross, order.Discount, shipping, net);

        db.LedgerEntries.Add(new LedgerEntry
        {
            OccurredAt = DateTime.UtcNow,
            EntryType = LedgerEntryType.Income,
            Amount = net,
            Description = description,
            Source = LedgerSource.OrderDelivered,
            OrderId = order.Id,
        });

        order.FinanceRecorded = true;
        return Task.CompletedTask;
    }

    private static string BuildDeliveredOrderDescription(
        int orderId,
        decimal gross,
        decimal discount,
        decimal shipping,
        decimal net)
    {
        var parts = new List<string> { $"porudžbina #{orderId} ({gross:N0} RSD" };
        if (discount > 0)
            parts[0] += $", popust {discount:N0} RSD";
        if (shipping > 0)
            parts.Add($"trošak dostave {shipping:N0} RSD");
        if (shipping > 0)
            parts.Add($"neto {net:N0} RSD");
        return $"Uplata korisnika — {string.Join(", ", parts)})";
    }

    public static Task RecordFreeShippingDeliveryCostAsync(
        AppDbContext db,
        Order order,
        decimal deliveryCost,
        CancellationToken ct = default)
    {
        if (!order.FreeShippingApplied || deliveryCost < 0)
            return Task.CompletedTask;

        if (order.FreeShippingDeliveryCost is not null)
            return Task.CompletedTask;

        order.FreeShippingDeliveryCost = deliveryCost;

        if (deliveryCost <= 0)
            return Task.CompletedTask;

        var occurredAt = DateTime.UtcNow;
        db.LedgerEntries.Add(new LedgerEntry
        {
            OccurredAt = occurredAt,
            EntryType = LedgerEntryType.Expense,
            Amount = deliveryCost,
            Description = $"Trošak dostave (besplatna za kupca) — porudžbina #{order.Id} ({deliveryCost:N0} RSD)",
            Source = LedgerSource.FreeShippingDelivery,
            OrderId = order.Id,
        });

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
        product.OrderedQuantity += quantity;

        await db.SaveChangesAsync(ct);

        db.LedgerEntries.Add(new LedgerEntry
        {
            OccurredAt = DateTime.UtcNow,
            EntryType = LedgerEntryType.Expense,
            Amount = totalCost,
            Description = transportTotal > 0
                ? $"Nabavka (poručeno): {product.Name} {quantity} kom — ukupno {totalCost:N0} RSD (roba {merchandiseTotal:N0}, transport {transportTotal:N0})"
                : $"Nabavka (poručeno): {product.Name} {quantity} kom — ukupno {totalCost:N0} RSD",
            Source = LedgerSource.StockPurchase,
            ProductId = product.Id,
            StockReceiptId = receipt.Id,
        });

        await db.SaveChangesAsync(ct);
        return receipt;
    }

    public static async Task<(string? Error, int StockBefore)> ConfirmSingleStockArrivalAsync(
        AppDbContext db,
        Product product,
        int receiptId,
        CancellationToken ct = default)
    {
        var receipt = await db.StockReceipts
            .FirstOrDefaultAsync(
                r => r.Id == receiptId && r.ProductId == product.Id && r.ReceivedAt == null,
                ct);

        if (receipt is null)
            return ("Evidencija nabavke nije pronađena ili je roba već primljena.", 0);

        var stockBefore = product.StockQuantity;
        ApplyReceiptToStock(product, receipt);
        receipt.ReceivedAt = DateTime.UtcNow;
        product.OrderedQuantity = Math.Max(0, product.OrderedQuantity - receipt.Quantity);
        await db.SaveChangesAsync(ct);
        return (null, stockBefore);
    }

    public static async Task<string?> CancelPendingStockReceiptAsync(
        AppDbContext db,
        Product product,
        int receiptId,
        CancellationToken ct = default)
    {
        var receipt = await db.StockReceipts
            .FirstOrDefaultAsync(r => r.Id == receiptId && r.ProductId == product.Id, ct);

        if (receipt is null)
            return "Evidencija nabavke nije pronađena.";

        if (receipt.ReceivedAt is not null)
            return "Roba je već primljena na lager i ne može se ukloniti ovim putem.";

        var ledger = await db.LedgerEntries
            .FirstOrDefaultAsync(e => e.StockReceiptId == receiptId, ct);
        if (ledger is not null)
            db.LedgerEntries.Remove(ledger);

        product.OrderedQuantity = Math.Max(0, product.OrderedQuantity - receipt.Quantity);
        db.StockReceipts.Remove(receipt);
        await db.SaveChangesAsync(ct);
        return null;
    }

    public static async Task<string?> ApplyStockWriteOffAsync(
        AppDbContext db,
        Product product,
        int quantity,
        string? note,
        CancellationToken ct = default)
    {
        if (quantity <= 0)
            return "Količina mora biti veća od nule.";

        if (product.StockQuantity < quantity)
            return $"Na stanju je samo {product.StockQuantity} komada.";

        product.StockQuantity -= quantity;

        var trimmedNote = note?.Trim();
        var desc = string.IsNullOrWhiteSpace(trimmedNote)
            ? $"Otpis: {product.Name} — {quantity} kom"
            : $"Otpis: {product.Name} — {quantity} kom — {trimmedNote}";

        db.LedgerEntries.Add(new LedgerEntry
        {
            OccurredAt = DateTime.UtcNow,
            EntryType = LedgerEntryType.Expense,
            Amount = 0,
            Description = desc,
            Source = LedgerSource.StockWriteOff,
            ProductId = product.Id,
            WriteOffQuantity = quantity,
            WriteOffNote = string.IsNullOrWhiteSpace(trimmedNote) ? null : trimmedNote,
        });

        await db.SaveChangesAsync(ct);
        return null;
    }

    private static void ApplyReceiptToStock(Product product, StockReceipt receipt)
    {
        var oldQty = product.StockQuantity;
        var oldCost = product.UnitCostPrice ?? receipt.UnitCost;
        var receiptTransportUnit = receipt.Quantity > 0
            ? Math.Round(receipt.TransportCost / receipt.Quantity, 2)
            : 0m;
        var oldTransport = product.UnitTransportCost ?? receiptTransportUnit;
        product.StockQuantity += receipt.Quantity;
        if (receipt.Quantity > 0)
        {
            product.UnitCostPrice = oldQty + receipt.Quantity > 0
                ? Math.Round((oldQty * oldCost + receipt.Quantity * receipt.UnitCost) / (oldQty + receipt.Quantity), 2)
                : receipt.UnitCost;

            if (receipt.TransportCost > 0 || product.UnitTransportCost is not null)
            {
                product.UnitTransportCost = oldQty + receipt.Quantity > 0
                    ? Math.Round((oldQty * oldTransport + receipt.Quantity * receiptTransportUnit) / (oldQty + receipt.Quantity), 2)
                    : receiptTransportUnit;
            }
        }
        else if (product.UnitCostPrice is null)
        {
            product.UnitCostPrice = receipt.UnitCost;
        }
    }
}
