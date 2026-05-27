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
    string? PurchaseNote = null,
    decimal? OrderGrossAmount = null,
    decimal? OrderDeliveryCost = null);

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

public class StockWriteOffRequest
{
    [Range(1, 100000)]
    public int Quantity { get; set; }

    [Required, MaxLength(500)]
    public string Note { get; set; } = string.Empty;
}

public record PendingStockReceiptResponse(
    int Id,
    int Quantity,
    decimal UnitCost,
    decimal TransportCost,
    decimal TotalCost,
    string? Note,
    DateTime CreatedAt);

public record ProductStockLedgerDetailResponse(
    int? PurchaseQuantity = null,
    decimal? PurchaseUnitCost = null,
    decimal? PurchaseTransportUnitCost = null,
    decimal? PurchaseMerchandiseTotal = null,
    decimal? PurchaseTransportTotal = null,
    decimal? PurchaseTotalCost = null,
    string? PurchaseNote = null,
    int? WriteOffQuantity = null,
    string? WriteOffNote = null,
    int? OrderId = null,
    string? OrderStatus = null,
    string? OrderCustomerName = null,
    string? OrderCustomerEmail = null,
    string? OrderDeliveryAddress = null,
    string? OrderPhone = null,
    string? OrderPaymentMethod = null,
    decimal? OrderSubtotal = null,
    decimal? OrderDiscount = null,
    string? OrderCouponCode = null,
    decimal? OrderTotal = null,
    bool? OrderFreeShippingApplied = null,
    decimal? OrderFreeShippingDeliveryCost = null,
    DateTime? OrderCreatedAt = null,
    int? OrderItemQuantity = null,
    decimal? OrderItemUnitPrice = null,
    string? OrderRestoreNote = null,
    IReadOnlyCollection<OrderItemResponse>? OrderItems = null);

public record ProductStockLedgerRowResponse(
    int Sequence,
    DateTime OccurredAt,
    string Kind,
    string Label,
    int QuantityDelta,
    string Reference,
    ProductStockLedgerDetailResponse Detail);

public record ProductStatsResponse(
    int ProductId,
    string Name,
    decimal Price,
    decimal? UnitCostPrice,
    decimal? UnitTransportCost,
    decimal? AveragePurchaseUnitCost,
    int StockQuantity,
    int OrderedQuantity,
    int PendingReceiptQuantity,
    int TotalSoldQuantity,
    decimal TotalRevenue,
    decimal TotalCostOfGoods,
    decimal TotalProfit,
    decimal ProfitPerUnitSold,
    decimal? UnitMargin,
    decimal? MarginPercent,
    decimal? ProfitMarginPercent,
    decimal? AverageSalePrice,
    int ActiveOrderQuantity,
    int ReturnedCancelledQuantity,
    int DeliveredOrderCount,
    int TotalOrdersWithProduct,
    int WishlistCount,
    int TotalPurchasedQuantity,
    decimal TotalPurchaseSpend,
    int PurchaseReceiptCount,
    decimal StockRetailValue,
    decimal? StockCostValue);
