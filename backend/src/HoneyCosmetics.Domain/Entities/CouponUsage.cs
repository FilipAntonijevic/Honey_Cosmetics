namespace HoneyCosmetics.Domain.Entities;

public class CouponUsage
{
    public int Id { get; set; }
    public int CouponId { get; set; }
    public Coupon? Coupon { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;
}
