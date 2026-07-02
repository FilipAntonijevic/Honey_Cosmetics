using HoneyCosmetics.Infrastructure.Configurations;

namespace HoneyCosmetics.Api.Extensions;

public static class SendGridStartupExtensions
{
    public static void LogSendGridProductionReadiness(
        this WebApplication app,
        string authenticatedDomain = "honey-cosmetic.com")
    {
        var section = app.Configuration.GetSection("SendGrid");
        var settings = section.Get<SendGridSettings>() ?? new SendGridSettings();

        var apiKey = settings.ApiKey;
        var fromEmail = settings.FromEmail?.Trim() ?? string.Empty;
        var fromName = settings.FromName?.Trim() ?? string.Empty;
        var adminEmail = settings.AdminEmail?.Trim() ?? string.Empty;
        var replyTo = settings.ReplyToEmail?.Trim() ?? string.Empty;

        var keyConfigured = !string.IsNullOrWhiteSpace(apiKey)
            && !apiKey.Contains("YOUR_SENDGRID", StringComparison.OrdinalIgnoreCase);

        app.Logger.LogInformation(
            "SendGrid: API key {KeyState}, From={FromEmail} ({FromName}), Admin fallback={AdminEmail}, Reply-To default={ReplyTo}",
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
                "PRODUCTION: SendGrid__ApiKey is not set. Transactional email will fail.");
        }

        if (string.IsNullOrEmpty(fromEmail))
        {
            app.Logger.LogWarning(
                "PRODUCTION: SendGrid__FromEmail is not set. Use noreply@{Domain} after domain authentication.",
                authenticatedDomain);
            return;
        }

        if (!fromEmail.EndsWith($"@{authenticatedDomain}", StringComparison.OrdinalIgnoreCase))
        {
            app.Logger.LogWarning(
                "PRODUCTION: SendGrid__FromEmail ({FromEmail}) does not use authenticated domain @{Domain}. " +
                "Emails may land in spam until domain authentication is verified in SendGrid.",
                fromEmail,
                authenticatedDomain);
        }
    }
}
