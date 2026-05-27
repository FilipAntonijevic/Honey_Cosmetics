using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

public static class ProductStockLedgerService
{
    private sealed record RawEvent(
        DateTime OccurredAt,
        int SortKey,
        ProductStockLedgerKind Kind,
        int QuantityDelta,
        int? OrderId,
        int? StockReceiptId,
        int? LedgerEntryId);

    public static async Task<IReadOnlyCollection<ProductStockLedgerRowResponse>> GetLedgerAsync(
        AppDbContext db,
        int productId,
        CancellationToken ct = default)
    {
        var exists = await db.Products.AnyAsync(p => p.Id == productId, ct);
        if (!exists)
            return [];

        var events = new List<RawEvent>();

        var receipts = await db.StockReceipts
            .AsNoTracking()
            .Where(r => r.ProductId == productId && r.ReceivedAt != null)
            .OrderBy(r => r.ReceivedAt)
            .ToListAsync(ct);

        foreach (var receipt in receipts)
        {
            events.Add(new RawEvent(
                receipt.ReceivedAt!.Value,
                receipt.Id * 10 + 1,
                ProductStockLedgerKind.PurchaseReceived,
                receipt.Quantity,
                null,
                receipt.Id,
                null));
        }

        var writeOffs = await db.LedgerEntries
            .AsNoTracking()
            .Where(e => e.ProductId == productId && e.Source == LedgerSource.StockWriteOff)
            .OrderBy(e => e.OccurredAt)
            .ToListAsync(ct);

        foreach (var entry in writeOffs)
        {
            var qty = entry.WriteOffQuantity ?? 0;
            if (qty <= 0) continue;
            events.Add(new RawEvent(
                entry.OccurredAt,
                entry.Id,
                ProductStockLedgerKind.WriteOff,
                -qty,
                null,
                null,
                entry.Id));
        }

        var orderItems = await db.OrderItems
            .AsNoTracking()
            .Include(i => i.Order)
            .Where(i => i.ProductId == productId)
            .OrderBy(i => i.Order!.CreatedAt)
            .ToListAsync(ct);

        foreach (var item in orderItems)
        {
            var order = item.Order;
            if (order is null) continue;

            events.Add(new RawEvent(
                order.CreatedAt,
                item.Id * 10,
                ProductStockLedgerKind.OrderPlaced,
                -item.Quantity,
                order.Id,
                null,
                null));

            if (order.Status is OrderStatus.Cancelled or OrderStatus.Returned)
            {
                events.Add(new RawEvent(
                    order.CreatedAt.AddMilliseconds(item.Id),
                    item.Id * 10 + 2,
                    ProductStockLedgerKind.OrderRestored,
                    item.Quantity,
                    order.Id,
                    null,
                    null));
            }
        }

        var receiptById = receipts.ToDictionary(r => r.Id);
        var writeOffById = writeOffs.ToDictionary(e => e.Id);

        var orderIds = events
            .Where(e => e.OrderId is not null)
            .Select(e => e.OrderId!.Value)
            .Distinct()
            .ToList();

        var orders = await db.Orders
            .AsNoTracking()
            .Include(o => o.User)
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .Where(o => orderIds.Contains(o.Id))
            .ToDictionaryAsync(o => o.Id, ct);

        var ordered = events
            .Where(e => e.QuantityDelta != 0)
            .OrderBy(e => e.OccurredAt)
            .ThenBy(e => e.SortKey)
            .ToList();

        var rows = new List<ProductStockLedgerRowResponse>();
        var sequence = 0;
        foreach (var e in ordered)
        {
            if (e.QuantityDelta == 0) continue;
            sequence++;
            rows.Add(new ProductStockLedgerRowResponse(
                sequence,
                e.OccurredAt,
                e.Kind.ToString(),
                LabelFor(e.Kind),
                e.QuantityDelta,
                ReferenceFor(e),
                BuildDetail(e, receiptById, writeOffById, orders, productId)));
        }

        rows.Reverse();
        return rows;
    }

    private static string LabelFor(ProductStockLedgerKind kind) => kind switch
    {
        ProductStockLedgerKind.PurchaseReceived => "Nabavka",
        ProductStockLedgerKind.WriteOff => "Otpis",
        ProductStockLedgerKind.OrderPlaced or ProductStockLedgerKind.OrderRestored => "Porudžbina",
        _ => kind.ToString(),
    };

    private static string ReferenceFor(RawEvent e) => e.Kind switch
    {
        ProductStockLedgerKind.PurchaseReceived => $"Nabavka #{e.StockReceiptId}",
        ProductStockLedgerKind.WriteOff => "Otpis",
        ProductStockLedgerKind.OrderPlaced or ProductStockLedgerKind.OrderRestored => $"Porudžbina #{e.OrderId}",
        _ => "—",
    };

    private static ProductStockLedgerDetailResponse BuildDetail(
        RawEvent e,
        IReadOnlyDictionary<int, StockReceipt> receiptById,
        IReadOnlyDictionary<int, LedgerEntry> writeOffById,
        IReadOnlyDictionary<int, Order> orders,
        int productId)
    {
        if (e.Kind == ProductStockLedgerKind.PurchaseReceived
            && e.StockReceiptId is not null
            && receiptById.TryGetValue(e.StockReceiptId.Value, out var receipt))
        {
            var transportUnit = receipt.Quantity > 0
                ? Math.Round(receipt.TransportCost / receipt.Quantity, 2)
                : 0m;
            var merchandiseTotal = Math.Round(receipt.UnitCost * receipt.Quantity, 2);

            return new ProductStockLedgerDetailResponse(
                PurchaseQuantity: receipt.Quantity,
                PurchaseUnitCost: receipt.UnitCost,
                PurchaseTransportUnitCost: transportUnit,
                PurchaseMerchandiseTotal: merchandiseTotal,
                PurchaseTransportTotal: receipt.TransportCost,
                PurchaseTotalCost: receipt.TotalCost,
                PurchaseNote: receipt.Note);
        }

        if (e.Kind == ProductStockLedgerKind.WriteOff
            && e.LedgerEntryId is not null
            && writeOffById.TryGetValue(e.LedgerEntryId.Value, out var entry))
        {
            return new ProductStockLedgerDetailResponse(
                WriteOffQuantity: entry.WriteOffQuantity,
                WriteOffNote: entry.WriteOffNote ?? entry.Description);
        }

        if (e.OrderId is not null && orders.TryGetValue(e.OrderId.Value, out var order))
        {
            var line = order.Items.FirstOrDefault(i => i.ProductId == productId);
            var items = order.Items
                .Select(i => new OrderItemResponse(
                    i.ProductId,
                    i.Product?.Name ?? "—",
                    i.Product?.ImageUrl,
                    i.Quantity,
                    i.UnitPrice))
                .ToList();

            return new ProductStockLedgerDetailResponse(
                OrderId: order.Id,
                OrderStatus: order.Status.ToString(),
                OrderCustomerName: order.User is not null
                    ? $"{order.User.FirstName} {order.User.LastName}".Trim()
                    : (order.GuestName ?? "Gost"),
                OrderCustomerEmail: order.User?.Email ?? order.GuestEmail,
                OrderDeliveryAddress: order.DeliveryAddress,
                OrderPhone: order.Phone,
                OrderPaymentMethod: order.PaymentMethod.ToString(),
                OrderSubtotal: order.Subtotal,
                OrderDiscount: order.Discount,
                OrderCouponCode: order.CouponCode,
                OrderTotal: order.Total,
                OrderFreeShippingApplied: order.FreeShippingApplied,
                OrderFreeShippingDeliveryCost: order.FreeShippingDeliveryCost,
                OrderCreatedAt: order.CreatedAt,
                OrderItemQuantity: line?.Quantity,
                OrderItemUnitPrice: line?.UnitPrice,
                OrderRestoreNote: e.Kind == ProductStockLedgerKind.OrderRestored
                    ? order.Status == OrderStatus.Cancelled ? "Otkazano — roba vraćena na lager" : "Vraćeno — roba vraćena na lager"
                    : null,
                OrderItems: items);
        }

        return new ProductStockLedgerDetailResponse();
    }
}
