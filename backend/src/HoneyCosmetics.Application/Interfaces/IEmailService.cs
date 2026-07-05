namespace HoneyCosmetics.Application.Interfaces;

public interface IEmailService
{
    Task SendAsync(
        string to,
        string subject,
        string body,
        string? replyTo = null,
        string? fromEmail = null,
        string? fromName = null,
        CancellationToken cancellationToken = default);
}
