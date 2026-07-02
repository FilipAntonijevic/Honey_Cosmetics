namespace HoneyCosmetics.Infrastructure.Configurations;

public class SendGridSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    /// <summary>Fallback inbox when SiteSettings has no contact email configured.</summary>
    public string AdminEmail { get; set; } = string.Empty;
    /// <summary>Optional default Reply-To (e.g. info@honey-cosmetic.com). Per-message replyTo overrides this.</summary>
    public string? ReplyToEmail { get; set; }
}