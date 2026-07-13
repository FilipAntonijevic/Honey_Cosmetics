using HoneyCosmetics.Infrastructure.Configurations;

namespace HoneyCosmetics.Api.Extensions;

public static class MakeWebhookStartupExtensions
{
    public static void LogMakeWebhookProductionReadiness(this WebApplication app)
    {
        var url = app.Configuration.GetSection("MakeWebhook").Get<MakeWebhookSettings>()?.WebhookUrl?.Trim() ?? string.Empty;
        var configured = !string.IsNullOrWhiteSpace(url)
            && !url.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase);

        app.Logger.LogInformation(
            "MakeWebhook: URL {State}",
            configured ? "configured" : "not set (webhooks disabled)");
    }
}
