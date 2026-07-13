namespace HoneyCosmetics.Infrastructure.Configurations;

public class MakeWebhookSettings
{
    /// <summary>Make.com custom webhook URL. Prazno = isključeno.</summary>
    public string WebhookUrl { get; set; } = string.Empty;
}
