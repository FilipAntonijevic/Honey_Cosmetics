using System.Net.Http.Json;
using System.Text.Json.Serialization;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Infrastructure.Configurations;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HoneyCosmetics.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly BrevoSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IOptions<BrevoSettings> settings,
        HttpClient httpClient,
        ILogger<EmailService> logger)
    {
        _settings = settings.Value;
        _httpClient = httpClient;
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
            || _settings.ApiKey.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Brevo API ključ nije podešen.");
        }

        var effectiveFromEmail = !string.IsNullOrWhiteSpace(fromEmail)
            ? fromEmail.Trim()
            : _settings.FromEmail;
        if (string.IsNullOrWhiteSpace(effectiveFromEmail))
            throw new InvalidOperationException("Brevo FromEmail nije podešen.");

        var effectiveFromName = !string.IsNullOrWhiteSpace(fromName)
            ? fromName.Trim()
            : _settings.FromName;

        var effectiveReplyTo = !string.IsNullOrWhiteSpace(replyTo)
            ? replyTo.Trim()
            : _settings.ReplyToEmail?.Trim();

        var plainText = EmailContentHelper.ToPlainText(body);
        var payload = new BrevoSendEmailRequest
        {
            Sender = new BrevoEmailAddress(effectiveFromEmail, effectiveFromName),
            To = [new BrevoEmailAddress(to)],
            Subject = subject,
            HtmlContent = body,
            TextContent = plainText,
            ReplyTo = string.IsNullOrWhiteSpace(effectiveReplyTo)
                ? null
                : new BrevoEmailAddress(effectiveReplyTo),
            Tags = ["transactional"],
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", _settings.ApiKey);
        request.Content = JsonContent.Create(payload);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "Brevo odbio slanje na {To} sa {From}: HTTP {Status} — {Body}",
                to,
                effectiveFromEmail,
                (int)response.StatusCode,
                string.IsNullOrWhiteSpace(responseBody) ? "(prazan odgovor)" : responseBody);
            throw new InvalidOperationException(
                $"Slanje emaila nije uspelo (Brevo HTTP {(int)response.StatusCode}).");
        }

        _logger.LogInformation(
            "Brevo poslao email na {To} (subject: {Subject}, from: {From})",
            to,
            subject,
            effectiveFromEmail);
    }

    private sealed class BrevoSendEmailRequest
    {
        [JsonPropertyName("sender")]
        public BrevoEmailAddress Sender { get; set; } = null!;

        [JsonPropertyName("to")]
        public List<BrevoEmailAddress> To { get; set; } = [];

        [JsonPropertyName("subject")]
        public string Subject { get; set; } = string.Empty;

        [JsonPropertyName("htmlContent")]
        public string HtmlContent { get; set; } = string.Empty;

        [JsonPropertyName("textContent")]
        public string TextContent { get; set; } = string.Empty;

        [JsonPropertyName("replyTo")]
        public BrevoEmailAddress? ReplyTo { get; set; }

        [JsonPropertyName("tags")]
        public List<string> Tags { get; set; } = [];
    }

    private sealed record BrevoEmailAddress(
        [property: JsonPropertyName("email")] string Email,
        [property: JsonPropertyName("name")] string? Name = null);
}
