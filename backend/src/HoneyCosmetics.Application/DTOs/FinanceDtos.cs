using System.ComponentModel.DataAnnotations;
using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Application.DTOs;

public record LedgerEntryResponse(
    int Id,
    DateTime OccurredAt,
    string EntryType,
    decimal Amount,
    string Description,
    string Source,
    int? OrderId,
    int? ProductId,
    int? StockReceiptId,
    string? ProductName = null,
    int? PurchaseQuantity = null,
    decimal? PurchaseUnitCost = null,
    decimal? PurchaseMerchandiseTotal = null,
    decimal? PurchaseTransportCost = null,
    decimal? PurchaseTotalCost = null,
    string? PurchaseNote = null);

public record LedgerSummaryResponse(
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Balance);

public record ManualLedgerRequest(
    [Required] LedgerEntryType EntryType,
    [Range(0.01, 999999999)] decimal Amount,
    [Required, MaxLength(500)] string Description,
    DateTime? OccurredAt = null);

public class StockPurchaseRequest
{
    [Range(1, 100000)]
    public int Quantity { get; set; }

    [Range(0, 999999999)]
    public decimal UnitCost { get; set; }

    [Range(0, 999999999)]
    public decimal TransportUnitCost { get; set; }

    [Range(0, 999999999)]
    public decimal TransportCost { get; set; }

    /// <summary>Ako je setovano, UnitCost se računa iz ukupne cene robe (bez transporta).</summary>
    public decimal? TotalMerchandiseCost { get; set; }

    /// <summary>Ako je setovano, koristi se kao ukupan transport umesto TransportUnitCost × količina.</summary>
    public decimal? TotalTransportCost { get; set; }

    /// <summary>Ukupan trošak (roba + transport) — isti broj kao u formi „ukupan trošak narudžbine”.</summary>
    public decimal? TotalPurchaseCost { get; set; }

    public string? Note { get; set; }
}

public record ProductStatsResponse(
    int ProductId,
    string Name,
    decimal Price,
    decimal? UnitCostPrice,
    int StockQuantity,
    int TotalSoldQuantity,
    decimal TotalRevenue,
    decimal TotalCostOfGoods,
    decimal TotalProfit,
    decimal ProfitPerUnitSold);
