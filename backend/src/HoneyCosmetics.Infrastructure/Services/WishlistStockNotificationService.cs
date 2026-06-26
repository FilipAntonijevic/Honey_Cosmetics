using System.Net;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HoneyCosmetics.Infrastructure.Services;

public static class WishlistStockNotificationService
{
    public static async Task TryNotifyBackInStockAsync(
        AppDbContext db,
        IEmailService emailService,
        IConfiguration configuration,
        IOptions<SendGridSettings> sendGridOptions,
        Product product,
        int stockBefore,
        ILogger logger,
        CancellationToken ct = default)
    {
        if (product.IsDeleted || stockBefore > 0 || product.StockQuantity <= 0)
            return;

        var userIds = await db.Wishlists
            .AsNoTracking()
            .Where(w => w.ProductId == product.Id)
            .Select(w => w.UserId)
            .Distinct()
            .ToListAsync(ct);

        if (userIds.Count == 0)
            return;

        var users = await db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id) && u.Email != "")
            .ToListAsync(ct);

        if (users.Count == 0)
            return;

        await db.Entry(product).Reference(p => p.Category).LoadAsync(ct);
        await db.Entry(product).Reference(p => p.ProductType).LoadAsync(ct);

        var siteSettings = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        var replyTo = ResolveInfoEmail(siteSettings, sendGridOptions.Value);
        var frontendBase = GetFrontendBaseUrl(configuration);
        var apiBase = GetPublicApiBaseUrl(configuration);
        var productUrl = $"{frontendBase}/products/{product.Id}";
        var imageSrc = BuildAbsoluteImageUrl(apiBase, product.ImageUrl);
        var subject = $"Honey Cosmetics — {product.Name} je ponovo na stanju";
        var categoryLine = product.Category?.Name ?? product.ProductType?.Name ?? "";

        foreach (var user in users)
        {
            var name = string.IsNullOrWhiteSpace(user.FirstName)
                ? "dragi kupče"
                : user.FirstName.Trim();

            var body = BuildEmailBody(
                name,
                product,
                categoryLine,
                productUrl,
                imageSrc,
                replyTo);

            try
            {
                await emailService.SendAsync(user.Email, subject, body, replyTo, ct);
                logger.LogInformation(
                    "Wishlist back-in-stock email sent to {Email} for product {ProductId}",
                    user.Email,
                    product.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Wishlist back-in-stock email failed for {Email}, product {ProductId}",
                    user.Email,
                    product.Id);
            }
        }
    }

    private static string ResolveInfoEmail(SiteSettings? settings, SendGridSettings sendGrid)
    {
        var info = (settings?.EmailAddress ?? string.Empty).Trim();
        if (!string.IsNullOrEmpty(info))
            return info;

        var notifications = (settings?.NotificationsEmail ?? string.Empty).Trim();
        if (!string.IsNullOrEmpty(notifications))
            return notifications;

        return sendGrid.AdminEmail.Trim();
    }

    private static string GetFrontendBaseUrl(IConfiguration configuration)
    {
        var url = configuration["FrontendUrl"]?.Trim();
        if (string.IsNullOrEmpty(url))
            url = "https://filipantonijevic.github.io/Honey_Cosmetics";
        return url.TrimEnd('/');
    }

    private static string GetPublicApiBaseUrl(IConfiguration configuration)
    {
        var url = configuration["PublicApiUrl"]?.Trim();
        if (!string.IsNullOrEmpty(url))
            return url.TrimEnd('/');

        return "http://localhost:5128";
    }

    private static string BuildAbsoluteImageUrl(string apiBase, string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return string.Empty;

        if (imageUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || imageUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return imageUrl;

        var fileName = Path.GetFileName(imageUrl.Trim().TrimStart('/'));
        if (string.IsNullOrEmpty(fileName))
            return $"{apiBase}{(imageUrl.StartsWith('/') ? imageUrl : $"/{imageUrl}")}";

        var webpName = $"{Path.GetFileNameWithoutExtension(fileName)}.webp";
        return $"{apiBase}/images/medium/{webpName}";
    }

    private static string BuildEmailBody(
        string name,
        Product product,
        string categoryLine,
        string productUrl,
        string imageSrc,
        string contactEmail)
    {
        var description = TruncateDescription(product.Description, 400);
        var price = product.Price.ToString("N0");
        var stock = product.StockQuantity;
        var encodedName = WebUtility.HtmlEncode(product.Name);
        var encodedDesc = WebUtility.HtmlEncode(description);
        var encodedCategory = WebUtility.HtmlEncode(categoryLine);
        var encodedContact = WebUtility.HtmlEncode(contactEmail);

        var imageBlock = string.IsNullOrEmpty(imageSrc)
            ? ""
            : $"""
               <p style="text-align:center;margin:0 0 1.2rem;">
                 <a href="{productUrl}" style="text-decoration:none;">
                   <img src="{imageSrc}" alt="{encodedName}" width="280" style="max-width:100%;height:auto;border-radius:12px;border:1px solid #f1e5d8;" />
                 </a>
               </p>
               """;

        var categoryBlock = string.IsNullOrEmpty(categoryLine)
            ? ""
            : $"""<p style="margin:0.25rem 0 0;font-size:0.85rem;color:#9b8276;">{encodedCategory}</p>""";

        return $"""
            <div style="font-family:'Source Sans Pro',Arial,Helvetica,sans-serif;max-width:560px;margin:auto;background:#fff;padding:2rem;border:1px solid #f1e5d8;border-radius:12px;">
              <h2 style="color:#3f2b22;margin-bottom:0;">Honey Cosmetics</h2>
              <p style="color:#9b8276;font-size:0.82rem;margin-top:0.2rem;">Premium Beauty</p>
              <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.2rem 0;">

              <p style="font-size:1rem;">Zdravo <strong>{WebUtility.HtmlEncode(name)}</strong>,</p>
              <p style="color:#3f2b22;line-height:1.6;">
                Proizvod sa vaše liste želja je ponovo dostupan u prodavnici.
              </p>

              {imageBlock}

              <div style="background:#fdf9f5;border:1px solid #f1e5d8;border-radius:10px;padding:1rem 1.2rem;margin:1rem 0;">
                <h3 style="margin:0 0 0.35rem;color:#3f2b22;font-size:1.15rem;">{encodedName}</h3>
                {categoryBlock}
                <p style="margin:0.6rem 0 0;font-size:1rem;font-weight:700;color:#3f2b22;">{price} RSD</p>
                <p style="margin:0.35rem 0 0;font-size:0.88rem;color:#15803d;font-weight:600;">Na stanju: {stock} kom</p>
              </div>

              <p style="color:#4b5563;font-size:0.92rem;line-height:1.65;margin:0 0 1rem;white-space:pre-wrap;">{encodedDesc}</p>

              <a href="{productUrl}" style="display:inline-block;background:#131313;color:#fff;padding:0.75rem 1.5rem;border-radius:999px;text-decoration:none;font-size:0.9rem;">
                Pogledaj proizvod
              </a>

              <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.5rem 0;">
              <p style="color:#9b8276;font-size:0.8rem;margin:0;line-height:1.5;">
                Ovo obaveštenje ste primili jer ste dodali proizvod na listu želja dok nije bio na stanju.<br />
                Za pitanja pišite na <a href="mailto:{encodedContact}" style="color:#8B6B47;">{encodedContact}</a>.
              </p>
            </div>
            """;
    }

    private static string TruncateDescription(string text, int maxLen)
    {
        var t = (text ?? string.Empty).Trim();
        if (t.Length <= maxLen)
            return t;
        return t[..maxLen].TrimEnd() + "…";
    }
}
