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

    private static LedgerEntryResponse MapLedger(LedgerEntry e)
    {
        var receipt = e.StockReceipt;
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
            receipt?.Quantity,
            receipt?.UnitCost,
            merchandise,
            receipt?.TransportCost,
            receipt?.TotalCost,
            receipt?.Note);
    }
}
