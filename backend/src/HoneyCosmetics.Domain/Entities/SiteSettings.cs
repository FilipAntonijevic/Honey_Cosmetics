namespace HoneyCosmetics.Domain.Entities;

/// <summary>
/// Site-wide settings stored as a single row (Id = 1).
/// Currently holds the public social/contact links shown in the footer
/// community banner, but can be extended with more globally-tunable fields.
/// </summary>
public class SiteSettings
{
    public int Id { get; set; } = 1;
    public string InstagramUrl { get; set; } = string.Empty;
    public string TikTokUrl { get; set; } = string.Empty;
    public string EmailAddress { get; set; } = string.Empty;

    /// <summary>General info addresses shown on the contact page (newline-separated).</summary>
    public string InfoEmails { get; set; } = string.Empty;

    /// <summary>Inbox for contact-form messages; falls back to <see cref="EmailAddress"/> when empty.</summary>
    public string ContactEmail { get; set; } = string.Empty;

    public string MarketingEmail { get; set; } = string.Empty;
    public string OfficeEmail { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;
    public string ComplaintsEmail { get; set; } = string.Empty;
    public string WhatsAppNumber { get; set; } = string.Empty;
    public string ViberNumber { get; set; } = string.Empty;

    /// <summary>
    /// Inbox where order/shipment notifications are delivered. When empty,
    /// the system falls back to <c>SendGrid:AdminEmail</c> from appsettings.
    /// </summary>
    public string NotificationsEmail { get; set; } = string.Empty;

    /// <summary>Minimum cart total (after coupon) for free shipping.</summary>
    public decimal FreeShippingThreshold { get; set; } = 10000m;

    /// <summary>Standard shipping cost charged when free shipping threshold is not met.</summary>
    public decimal ShippingCost { get; set; } = 430m;

    /// <summary>Repeating text in the top notification banner (segments separated by •).</summary>
    public string NotificationBannerText { get; set; } = string.Empty;

    /// <summary>When false, the top notification banner is hidden for site visitors.</summary>
    public bool NotificationBannerEnabled { get; set; } = true;

    public string BankTransferRecipientName { get; set; } = string.Empty;
    public string BankTransferRecipientAddress { get; set; } = string.Empty;
    public string BankTransferAccountNumber { get; set; } = string.Empty;
    public string BankTransferBankName { get; set; } = string.Empty;
    /// <summary>Base payment purpose text; order id is appended when shown to customers.</summary>
    public string BankTransferPurpose { get; set; } = string.Empty;
}
