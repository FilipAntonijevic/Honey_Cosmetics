using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Domain.Entities;

public class Coupon
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public decimal DiscountValue { get; set; }
    public bool IsPercentage { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public CouponUsageLimit UsageLimit { get; set; } = CouponUsageLimit.OncePerUser;
    public List<CouponUsage> Usages { get; set; } = [];
}
