using HoneyCosmetics.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace HoneyCosmetics.Infrastructure.Services;

public class EmailService(IConfiguration configuration, ILogger<EmailService> logger) : IEmailService
{
    public async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        var host = configuration["Email:Smtp:Host"];

        if (string.IsNullOrWhiteSpace(host))
        {
            logger.LogInformation("EMAIL (no SMTP configured) => To: {To} | Subject: {Subject}", to, subject);
            return;
        }

        var from = configuration["Email:From"] ?? "noreply@honeycosmetics.rs";
        var port = int.Parse(configuration["Email:Smtp:Port"] ?? "587");
        var username = configuration["Email:Smtp:Username"] ?? string.Empty;
        var password = configuration["Email:Smtp:Password"] ?? string.Empty;

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = body };

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls, cancellationToken);

        if (!string.IsNullOrEmpty(username))
            await smtp.AuthenticateAsync(username, password, cancellationToken);

        await smtp.SendAsync(message, cancellationToken);
        await smtp.DisconnectAsync(true, cancellationToken);

        logger.LogInformation("Email sent to {To} | Subject: {Subject}", to, subject);
    }
}

