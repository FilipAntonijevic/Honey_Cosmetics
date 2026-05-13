using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Domain.Entities;

public class Order
{
    public int Id { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string? GuestName { get; set; }
    public string? GuestEmail { get; set; }
    public string DeliveryAddress { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<OrderItem> Items { get; set; } = [];
}
