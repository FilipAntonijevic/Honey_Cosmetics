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
    public string PhoneNumber { get; set; } = string.Empty;
    public string ComplaintsEmail { get; set; } = string.Empty;
    public string WhatsAppNumber { get; set; } = string.Empty;
    public string ViberNumber { get; set; } = string.Empty;
}
