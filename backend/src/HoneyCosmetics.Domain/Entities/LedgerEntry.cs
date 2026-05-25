using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Domain.Entities;

public class LedgerEntry
{
    public int Id { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public LedgerEntryType EntryType { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public LedgerSource Source { get; set; }
    public int? OrderId { get; set; }
    public Order? Order { get; set; }
    public int? ProductId { get; set; }
    public Product? Product { get; set; }
    public int? StockReceiptId { get; set; }
    public StockReceipt? StockReceipt { get; set; }
    public int? WriteOffQuantity { get; set; }
    public string? WriteOffNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
