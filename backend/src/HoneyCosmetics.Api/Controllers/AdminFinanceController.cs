using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/finance")]
public class AdminFinanceController(AppDbContext db) : ControllerBase
{
    [HttpGet("ledger")]
    public async Task<ActionResult<IReadOnlyCollection<LedgerEntryResponse>>> GetLedger(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = db.LedgerEntries.AsNoTracking().AsQueryable();
        if (from.HasValue)
            query = query.Where(x => x.OccurredAt >= NormalizeUtc(from.Value));
        if (to.HasValue)
            query = query.Where(x => x.OccurredAt <= NormalizeUtc(to.Value));

        var list = await query
            .Include(x => x.Product)
            .Include(x => x.StockReceipt)
            .Include(x => x.Order)
            .OrderByDescending(x => x.OccurredAt)
            .ThenByDescending(x => x.Id)
            .Take(2000)
            .ToListAsync();

        return Ok(list.Select(MapLedger));
    }

    [HttpGet("ledger/summary")]
    public async Task<ActionResult<LedgerSummaryResponse>> GetSummary()
    {
        var income = await db.LedgerEntries
            .Where(x => x.EntryType == LedgerEntryType.Income)
            .SumAsync(x => x.Amount);
        var expense = await db.LedgerEntries
            .Where(x => x.EntryType == LedgerEntryType.Expense)
            .SumAsync(x => x.Amount);

        return Ok(new LedgerSummaryResponse(income, expense, income - expense));
    }

    [HttpPost("ledger")]
    public async Task<ActionResult<LedgerEntryResponse>> CreateManual([FromBody] ManualLedgerRequest request)
    {
        var entry = new LedgerEntry
        {
            OccurredAt = request.OccurredAt is { } occurredAt
                ? NormalizeUtc(occurredAt)
                : DateTime.UtcNow,
            EntryType = request.EntryType,
            Amount = request.Amount,
            Description = request.Description.Trim(),
            Source = LedgerSource.Manual,
        };
        db.LedgerEntries.Add(entry);
        await db.SaveChangesAsync();
        return Ok(MapLedger(entry));
    }

    [HttpDelete("ledger/{id:int}")]
    public async Task<IActionResult> DeleteLedger(int id)
    {
        await using var tx = await db.Database.BeginTransactionAsync();

        var entry = await db.LedgerEntries
            .Include(e => e.StockReceipt)
            .Include(e => e.Order)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null)
        {
            await tx.RollbackAsync();
            return NotFound();
        }

        if (entry.Source == LedgerSource.OrderDelivered
            && entry.Order is { } deliveredOrder
            && (deliveredOrder.Status == OrderStatus.Delivered || deliveredOrder.FinanceRecorded))
        {
            await tx.RollbackAsync();
            return BadRequest(
                "Prihod dostavljene porudžbine ne može biti obrisan jer je status finalan i finansije se ne bi mogle bezbedno ponovo evidentirati.");
        }

        if (entry.Source == LedgerSource.FreeShippingDelivery
            && entry.Order is { Status: OrderStatus.Returned })
        {
            await tx.RollbackAsync();
            return BadRequest(
                "Trošak dostave vraćene porudžbine ne može biti obrisan jer je status finalan.");
        }

        StockReceipt? receiptToRemove = entry.StockReceipt;
        if (receiptToRemove is not null)
        {
            await db.Database.ExecuteSqlRawAsync(
                """SELECT 1 FROM "Products" WHERE "Id" = {0} FOR UPDATE""",
                [receiptToRemove.ProductId]);

            var currentReceiptValues = await db.Entry(receiptToRemove).GetDatabaseValuesAsync();
            if (currentReceiptValues is null)
            {
                await tx.RollbackAsync();
                return BadRequest("Evidencija nabavke je u međuvremenu već uklonjena.");
            }
            db.Entry(receiptToRemove).CurrentValues.SetValues(currentReceiptValues);

            var product = await db.Products.FindAsync(receiptToRemove.ProductId);
            if (product is not null)
            {
                await db.Entry(product).ReloadAsync();
                if (receiptToRemove.ReceivedAt is null)
                    product.OrderedQuantity = Math.Max(0, product.OrderedQuantity - receiptToRemove.Quantity);
                else
                {
                    if (product.StockQuantity < receiptToRemove.Quantity)
                    {
                        await tx.RollbackAsync();
                        return BadRequest(
                            "Primljena nabavka ne može biti obrisana jer deo te količine više nije na stanju.");
                    }

                    product.StockQuantity = Math.Max(0, product.StockQuantity - receiptToRemove.Quantity);
                    await InventoryFinanceService.RecalculateWeightedCostsAsync(
                        db,
                        product,
                        excludedReceiptId: receiptToRemove.Id);
                }
            }
        }

        if (entry.Source == LedgerSource.OrderDelivered && entry.OrderId is not null)
        {
            var order = entry.Order ?? await db.Orders.FindAsync(entry.OrderId.Value);
            if (order is not null)
            {
                order.FinanceRecorded = false;
                order.FreeShippingDeliveryCost = null;
            }
        }

        if (entry.Source == LedgerSource.FreeShippingDelivery && entry.OrderId is not null)
        {
            var order = entry.Order ?? await db.Orders.FindAsync(entry.OrderId.Value);
            if (order is not null)
                order.FreeShippingDeliveryCost = null;
        }

        if (entry.Source == LedgerSource.StockWriteOff
            && entry.ProductId is not null
            && entry.WriteOffQuantity is > 0)
        {
            var product = await db.Products.FindAsync(entry.ProductId.Value);
            if (product is not null)
                product.StockQuantity += entry.WriteOffQuantity.Value;
        }

        db.LedgerEntries.Remove(entry);
        if (receiptToRemove is not null)
            db.StockReceipts.Remove(receiptToRemove);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return NoContent();
    }

    private static DateTime NormalizeUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            // Date-only values from the admin UI have no timezone. Treat them
            // deterministically as UTC instead of applying the server timezone.
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

    private static LedgerEntryResponse MapLedger(LedgerEntry e)
    {
        var receipt = e.StockReceipt;
        var isWriteOff = e.Source == LedgerSource.StockWriteOff;
        decimal? merchandise = null;
        if (receipt is not null)
            merchandise = Math.Round(receipt.UnitCost * receipt.Quantity, 2);

        decimal? orderGross = null;
        decimal? orderDelivery = null;
        if (e.Source == LedgerSource.OrderDelivered && e.Order is not null)
        {
            orderDelivery = e.Order.FreeShippingDeliveryCost;
            if (orderDelivery is > 0)
                orderGross = e.Amount + orderDelivery.Value;
        }

        return new(
            e.Id,
            e.OccurredAt,
            e.EntryType.ToString(),
            e.Amount,
            e.Description,
            e.Source.ToString(),
            e.OrderId,
            e.ProductId,
            e.StockReceiptId,
            e.Product is null ? null : ProductVariantService.GetDisplayName(e.Product),
            isWriteOff ? e.WriteOffQuantity : receipt?.Quantity,
            isWriteOff ? null : receipt?.UnitCost,
            merchandise,
            isWriteOff ? null : receipt?.TransportCost,
            isWriteOff ? null : receipt?.TotalCost,
            isWriteOff ? e.WriteOffNote : receipt?.Note,
            orderGross,
            orderDelivery);
    }
}
