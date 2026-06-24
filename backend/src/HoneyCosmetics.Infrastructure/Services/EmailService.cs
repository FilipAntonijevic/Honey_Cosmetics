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
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey)
            || _settings.ApiKey.Contains("YOUR_SENDGRID", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("SendGrid API ključ nije podešen.");
        }

        var client = new SendGridClient(_settings.ApiKey);
        var from = new EmailAddress(_settings.FromEmail, _settings.FromName);
        var toEmail = new EmailAddress(to);

        var msg = MailHelper.CreateSingleEmail(from, toEmail, subject, "", body);

        if (!string.IsNullOrWhiteSpace(replyTo))
            msg.ReplyTo = new EmailAddress(replyTo.Trim());

        var response = await client.SendEmailAsync(msg, cancellationToken);
        var responseBody = await response.Body.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "SendGrid odbio slanje na {To} sa {From}: HTTP {Status} — {Body}",
                to,
                _settings.FromEmail,
                (int)response.StatusCode,
                string.IsNullOrWhiteSpace(responseBody) ? "(prazan odgovor)" : responseBody);
            throw new InvalidOperationException(
                $"Slanje emaila nije uspelo (SendGrid HTTP {(int)response.StatusCode}).");
        }
    }
}