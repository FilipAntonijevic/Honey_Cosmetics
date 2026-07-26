using HoneyCosmetics.Application.Interfaces;

namespace HoneyCosmetics.Tests.Support;

public sealed class CapturingEmailService : IEmailService
{
    public List<SentEmail> Sent { get; } = [];

    public Task SendAsync(
        string to,
        string subject,
        string body,
        string? replyTo = null,
        string? fromEmail = null,
        string? fromName = null,
        CancellationToken cancellationToken = default)
    {
        Sent.Add(new SentEmail(to, subject, body, replyTo, fromEmail, fromName));
        return Task.CompletedTask;
    }

    public sealed record SentEmail(
        string To,
        string Subject,
        string Body,
        string? ReplyTo,
        string? FromEmail,
        string? FromName);
}
