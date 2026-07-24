using System.Collections.Concurrent;
using System.Text;
using HoneyCosmetics.Application.Interfaces;

namespace HoneyCosmetics.Api.Middleware;

/// <summary>
/// Silent ops alert: emails Filip when checkout/guest-checkout fails.
/// Not exposed to the storefront UI.
/// </summary>
public sealed class CheckoutFailureAlertMiddleware(RequestDelegate next, ILogger<CheckoutFailureAlertMiddleware> logger)
{
    private const string AlertTo = "filipdantonijevic@gmail.com";
    private const string AlertSubject = "ACTION NEEDED — Honey Cosmetics checkout failed";
    private static readonly TimeSpan MinInterval = TimeSpan.FromMinutes(10);
    private static readonly ConcurrentDictionary<string, DateTimeOffset> LastSent = new(StringComparer.Ordinal);

    private static readonly PathString[] WatchedPaths =
    [
        new("/api/orders/checkout"),
        new("/api/orders/guest-checkout"),
    ];

    public async Task InvokeAsync(HttpContext context, IEmailService emailService)
    {
        if (!IsWatched(context.Request) ||
            !HttpMethods.IsPost(context.Request.Method))
        {
            await next(context);
            return;
        }

        var originalBody = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        Exception? thrown = null;
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            thrown = ex;
        }

        buffer.Position = 0;
        var bodyText = "";
        try
        {
            bodyText = await new StreamReader(
                    buffer,
                    Encoding.UTF8,
                    detectEncodingFromByteOrderMarks: false,
                    leaveOpen: true)
                .ReadToEndAsync();
        }
        catch
        {
            /* ignore */
        }

        buffer.Position = 0;
        context.Response.Body = originalBody;
        if (thrown is null)
        {
            try
            {
                await buffer.CopyToAsync(originalBody);
            }
            catch
            {
                /* response may already be aborted */
            }
        }

        var status = thrown is null ? context.Response.StatusCode : StatusCodes.Status500InternalServerError;
        if (thrown is not null || status >= StatusCodes.Status400BadRequest)
        {
            await SendAlertAsync(context, emailService, status, bodyText, thrown);
        }

        if (thrown is not null)
            throw thrown;
    }

    private static bool IsWatched(HttpRequest request) =>
        WatchedPaths.Any(p => request.Path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase));

    private async Task SendAlertAsync(
        HttpContext context,
        IEmailService emailService,
        int status,
        string responseBody,
        Exception? thrown)
    {
        try
        {
            var path = context.Request.Path.Value ?? "";
            var bucket = thrown is null
                ? $"status:{status}:{path}"
                : $"ex:{thrown.GetType().Name}:{path}";
            var now = DateTimeOffset.UtcNow;
            if (LastSent.TryGetValue(bucket, out var prev) && now - prev < MinInterval)
            {
                logger.LogInformation("Checkout failure alert suppressed (throttle) for {Bucket}", bucket);
                return;
            }

            LastSent[bucket] = now;

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "?";
            var ua = context.Request.Headers.UserAgent.ToString();
            if (ua.Length > 200)
                ua = ua[..200];

            var detail = thrown is not null
                ? $"{thrown.GetType().Name}: {thrown.Message}"
                : TrimBody(responseBody);

            var html = $"""
                <p><strong>ACTION NEEDED</strong></p>
                <p>Checkout request failed on production.</p>
                <ul>
                  <li><b>Path:</b> {System.Net.WebUtility.HtmlEncode(path)}</li>
                  <li><b>Status:</b> {status}</li>
                  <li><b>Time (UTC):</b> {now:yyyy-MM-dd HH:mm:ss}</li>
                  <li><b>IP:</b> {System.Net.WebUtility.HtmlEncode(ip)}</li>
                  <li><b>User-Agent:</b> {System.Net.WebUtility.HtmlEncode(ua)}</li>
                </ul>
                <p><b>Detail:</b></p>
                <pre style="white-space:pre-wrap;font-size:13px;background:#f6f6f6;padding:12px;border-radius:8px;">{System.Net.WebUtility.HtmlEncode(detail)}</pre>
                <p style="color:#666;font-size:12px;">Hardcoded ops alert — not shown on the website.</p>
                """;

            await emailService.SendAsync(AlertTo, AlertSubject, html);
            logger.LogWarning(
                "Checkout failure alert emailed to {To} for {Path} status {Status}",
                AlertTo,
                path,
                status);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send checkout failure alert email");
        }
    }

    private static string TrimBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return "(empty response body)";
        body = body.Trim();
        return body.Length <= 4000 ? body : body[..4000] + "…";
    }
}
