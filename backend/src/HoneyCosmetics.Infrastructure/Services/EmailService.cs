using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Infrastructure.Configurations;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace HoneyCosmetics.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly SendGridSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IOptions<SendGridSettings> settings,
        ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string to,
        string subject,
        string body,
        string? replyTo = null,
        string? fromEmail = null,
        string? fromName = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey)
            || _settings.ApiKey.Contains("YOUR_SENDGRID", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("SendGrid API ključ nije podešen.");
        }

        var effectiveFromEmail = !string.IsNullOrWhiteSpace(fromEmail)
            ? fromEmail.Trim()
            : _settings.FromEmail;
        if (string.IsNullOrWhiteSpace(effectiveFromEmail))
            throw new InvalidOperationException("SendGrid FromEmail nije podešen.");

        var effectiveFromName = !string.IsNullOrWhiteSpace(fromName)
            ? fromName.Trim()
            : _settings.FromName;

        var client = new SendGridClient(_settings.ApiKey);
        var from = new EmailAddress(effectiveFromEmail, effectiveFromName);
        var toEmail = new EmailAddress(to);
        var plainText = EmailContentHelper.ToPlainText(body);

        var msg = MailHelper.CreateSingleEmail(from, toEmail, subject, plainText, body);

        // Transactional best practice: do not rewrite links or track opens/clicks.
        msg.SetClickTracking(false, false);
        msg.SetOpenTracking(false);
        msg.AddCategory("transactional");

        // Transactional mail: bypass list/unsubscribe/bounce/spam suppression.
        // SendGrid treats bypass_list_management as mutually exclusive with the
        // individual bypass_* flags — use only BypassListManagement.
        msg.MailSettings = new MailSettings
        {
            BypassListManagement = new BypassListManagement { Enable = true },
        };

        var effectiveReplyTo = !string.IsNullOrWhiteSpace(replyTo)
            ? replyTo.Trim()
            : _settings.ReplyToEmail?.Trim();
        if (!string.IsNullOrWhiteSpace(effectiveReplyTo))
            msg.ReplyTo = new EmailAddress(effectiveReplyTo);

        var response = await client.SendEmailAsync(msg, cancellationToken);
        var responseBody = await response.Body.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "SendGrid odbio slanje na {To} sa {From}: HTTP {Status} — {Body}",
                to,
                effectiveFromEmail,
                (int)response.StatusCode,
                string.IsNullOrWhiteSpace(responseBody) ? "(prazan odgovor)" : responseBody);
            throw new InvalidOperationException(
                $"Slanje emaila nije uspelo (SendGrid HTTP {(int)response.StatusCode}).");
        }

        _logger.LogInformation(
            "SendGrid poslao email na {To} (subject: {Subject}, from: {From})",
            to,
            subject,
            effectiveFromEmail);
    }
}
