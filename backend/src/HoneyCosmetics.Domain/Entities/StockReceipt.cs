namespace HoneyCosmetics.Domain.Entities;

public class StockReceipt
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TransportCost { get; set; }
    public decimal TotalCost { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReceivedAt { get; set; }
}
