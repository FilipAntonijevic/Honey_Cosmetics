using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Domain.Entities;

public class SitePopup
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string MobileImageUrl { get; set; } = string.Empty;
    public SitePopupType Type { get; set; }
    public int? ProductId { get; set; }
    public Product? Product { get; set; }
    public string? CouponCode { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
