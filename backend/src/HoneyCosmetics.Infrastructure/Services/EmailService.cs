using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Infrastructure.Configurations;
using Microsoft.Extensions.Options;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace HoneyCosmetics.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly SendGridSettings _settings;

    public EmailService(
        IOptions<SendGridSettings> settings)
    {
        _settings = settings.Value;
    }

    public async Task SendAsync(
        string to,
        string subject,
        string body,
        CancellationToken cancellationToken = default)
    {
        var client =
            new SendGridClient(_settings.ApiKey);

        var from =
            new EmailAddress(
                _settings.FromEmail,
                _settings.FromName);

        var toEmail =
            new EmailAddress(to);

        var msg =
            MailHelper.CreateSingleEmail(
                from,
                toEmail,
                subject,
                "",
                body);

        var response =
            await client.SendEmailAsync(msg, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var responseBody =
                await response.Body.ReadAsStringAsync(cancellationToken);

            throw new Exception(
                $"SendGrid email failed: {responseBody}");
        }
    }
}