using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

/// <summary>
/// Sprečava duplirane porudžbine kada klijent više puta pošalje isti checkout zahtev.
/// </summary>
public static class OrderDuplicateGuard
{
    // Dupli klik / paralelni submit — ne namerna druga porudžbina minut kasnije.
    private static readonly TimeSpan DuplicateWindow = TimeSpan.FromSeconds(60);

    public static async Task<Order?> FindRecentDuplicateGuestOrderAsync(
        AppDbContext db,
        string guestName,
        string guestEmail,
        string guestPhone,
        string deliveryAddress,
        PaymentMethod paymentMethod,
        decimal total,
        IReadOnlyList<CartItemRequest> items,
        CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.Subtract(DuplicateWindow);
        var email = guestEmail.Trim().ToLowerInvariant();
        var name = guestName.Trim();
        var requestedLines = NormalizeLines(items);

        var candidates = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o =>
                o.UserId == null
                && o.CreatedAt >= since
                && o.DeliveryAddress == deliveryAddress
                && o.Phone == guestPhone
                && o.Total == total
                && o.PaymentMethod == paymentMethod
                && (name == string.Empty || o.GuestName == name)
                && (email == string.Empty
                    || (o.GuestEmail != null && o.GuestEmail.ToLower() == email)))
            .OrderByDescending(o => o.CreatedAt)
            .Take(10)
            .ToListAsync(ct);

        return candidates.FirstOrDefault(o => LinesMatch(o.Items, requestedLines));
    }

    public static async Task<Order?> FindRecentDuplicateUserOrderAsync(
        AppDbContext db,
        Guid userId,
        string deliveryAddress,
        string phone,
        PaymentMethod paymentMethod,
        decimal total,
        IEnumerable<(int ProductId, int Quantity)> cartLines,
        CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.Subtract(DuplicateWindow);
        var requestedLines = NormalizeLines(cartLines);

        var candidates = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o =>
                o.UserId == userId
                && o.CreatedAt >= since
                && o.DeliveryAddress == deliveryAddress
                && o.Phone == phone
                && o.Total == total
                && o.PaymentMethod == paymentMethod)
            .OrderByDescending(o => o.CreatedAt)
            .Take(10)
            .ToListAsync(ct);

        return candidates.FirstOrDefault(o => LinesMatch(o.Items, requestedLines));
    }

    private static List<(int ProductId, int Quantity)> NormalizeLines(
        IEnumerable<CartItemRequest> items) =>
        items
            .GroupBy(i => i.ProductId)
            .Select(g => (g.Key, g.Sum(x => x.Quantity)))
            .OrderBy(x => x.Key)
            .ToList();

    private static List<(int ProductId, int Quantity)> NormalizeLines(
        IEnumerable<(int ProductId, int Quantity)> items) =>
        items
            .GroupBy(i => i.ProductId)
            .Select(g => (g.Key, g.Sum(x => x.Quantity)))
            .OrderBy(x => x.Key)
            .ToList();

    private static bool LinesMatch(
        IEnumerable<OrderItem> existing,
        IReadOnlyList<(int ProductId, int Quantity)> requested) =>
        NormalizeLines(existing.Select(i => (i.ProductId, i.Quantity)))
            .SequenceEqual(requested);
}
