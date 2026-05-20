namespace HoneyCosmetics.Application.Interfaces;

public interface IEmailService
{
    Task SendAsync(
        string to,
        string subject,
        string body,
        string? replyTo = null,
        CancellationToken cancellationToken = default);
}
