using HoneyCosmetics.Infrastructure.Configurations;

namespace HoneyCosmetics.Api.Extensions;

public static class BrevoStartupExtensions
{
    public static void LogBrevoProductionReadiness(
        this WebApplication app,
        string authenticatedDomain = "honey-cosmetic.com")
    {
        var section = app.Configuration.GetSection("Brevo");
        var settings = section.Get<BrevoSettings>() ?? new BrevoSettings();

        var apiKey = settings.ApiKey;
        var fromEmail = settings.FromEmail?.Trim() ?? string.Empty;
        var fromName = settings.FromName?.Trim() ?? string.Empty;
        var adminEmail = settings.AdminEmail?.Trim() ?? string.Empty;
        var replyTo = settings.ReplyToEmail?.Trim() ?? string.Empty;

        var keyConfigured = !string.IsNullOrWhiteSpace(apiKey)
            && !apiKey.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase);

        app.Logger.LogInformation(
            "Brevo: API key {KeyState}, From={FromEmail} ({FromName}), Admin fallback={AdminEmail}, Reply-To default={ReplyTo}",
            keyConfigured ? "configured" : "MISSING",
            string.IsNullOrEmpty(fromEmail) ? "(not set)" : fromEmail,
            string.IsNullOrEmpty(fromName) ? "(not set)" : fromName,
            string.IsNullOrEmpty(adminEmail) ? "(not set)" : adminEmail,
            string.IsNullOrEmpty(replyTo) ? "(not set)" : replyTo);

        if (!app.Environment.IsProduction())
            return;

        if (!keyConfigured)
        {
            app.Logger.LogWarning(
                "PRODUCTION: Brevo__ApiKey is not set. Transactional email will fail.");
        }

        if (string.IsNullOrEmpty(fromEmail))
        {
            app.Logger.LogWarning(
                "PRODUCTION: Brevo__FromEmail is not set. Use info@{Domain} after domain authentication.",
                authenticatedDomain);
            return;
        }

        if (!fromEmail.EndsWith($"@{authenticatedDomain}", StringComparison.OrdinalIgnoreCase))
        {
            app.Logger.LogWarning(
                "PRODUCTION: Brevo__FromEmail ({FromEmail}) does not use authenticated domain @{Domain}. " +
                "Emails may land in spam until domain authentication is verified in Brevo.",
                fromEmail,
                authenticatedDomain);
        }
    }
}
