using System.Text.RegularExpressions;
using HoneyCosmetics.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace HoneyCosmetics.Infrastructure.Services;

public class EmailService(ILogger<EmailService> logger) : IEmailService
{
    private static readonly Regex UnsafeLineBreaks = new("[\r\n]+", RegexOptions.Compiled);

    public Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        var safeTo = UnsafeLineBreaks.Replace(to, " ");
        var safeSubject = UnsafeLineBreaks.Replace(subject, " ");
        var safeBody = UnsafeLineBreaks.Replace(body, " ");

        logger.LogInformation("EMAIL => To: {To}, Subject: {Subject}, Body: {Body}", safeTo, safeSubject, safeBody);
        return Task.CompletedTask;
    }
}
