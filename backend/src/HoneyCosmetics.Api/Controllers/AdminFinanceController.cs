using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
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
            query = query.Where(x => x.OccurredAt >= from.Value.ToUniversalTime());
        if (to.HasValue)
            query = query.Where(x => x.OccurredAt <= to.Value.ToUniversalTime());

        var list = await query
            .Include(x => x.Product)
            .Include(x => x.StockReceipt)
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
            OccurredAt = request.OccurredAt?.ToUniversalTime() ?? DateTime.UtcNow,
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
        var entry = await db.LedgerEntries
            .Include(e => e.StockReceipt)
            .Include(e => e.Order)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null)
            return NotFound();

        StockReceipt? receiptToRemove = entry.StockReceipt;
        if (receiptToRemove is not null)
        {
            var product = await db.Products.FindAsync(receiptToRemove.ProductId);
            if (product is not null)
            {
                if (receiptToRemove.ReceivedAt is null)
                    product.OrderedQuantity = Math.Max(0, product.OrderedQuantity - receiptToRemove.Quantity);
                else
                    product.StockQuantity = Math.Max(0, product.StockQuantity - receiptToRemove.Quantity);
            }
        }

        if (entry.Source == LedgerSource.OrderDelivered && entry.OrderId is not null)
        {
            var order = entry.Order ?? await db.Orders.FindAsync(entry.OrderId.Value);
            if (order is not null)
                order.FinanceRecorded = false;
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
        return NoContent();
    }

    private static LedgerEntryResponse MapLedger(LedgerEntry e)
    {
        var receipt = e.StockReceipt;
        var isWriteOff = e.Source == LedgerSource.StockWriteOff;
        decimal? merchandise = null;
        if (receipt is not null)
            merchandise = Math.Round(receipt.UnitCost * receipt.Quantity, 2);

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
            e.Product?.Name,
            isWriteOff ? e.WriteOffQuantity : receipt?.Quantity,
            isWriteOff ? null : receipt?.UnitCost,
            merchandise,
            isWriteOff ? null : receipt?.TransportCost,
            isWriteOff ? null : receipt?.TotalCost,
            isWriteOff ? e.WriteOffNote : receipt?.Note);
    }
}
