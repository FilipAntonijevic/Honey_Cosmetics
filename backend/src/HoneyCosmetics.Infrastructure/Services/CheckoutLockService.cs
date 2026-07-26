using System.Security.Cryptography;
using System.Text;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

/// <summary>
/// Zaključavanje checkout-a i idempotentno pronalaženje porudžbine.
/// </summary>
public static class CheckoutLockService
{
    public const int MaxIdempotencyKeyLength = 128;

    public static async Task<Order?> FindByIdempotencyKeyAsync(
        AppDbContext db,
        string? idempotencyKey,
        CancellationToken ct = default)
    {
        var key = NormalizeKey(idempotencyKey);
        if (key is null)
            return null;

        return await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.IdempotencyKey == key, ct);
    }

    public static async Task AcquireAsync(AppDbContext db, string lockKey, CancellationToken ct = default)
    {
        // Advisory locks exist only on PostgreSQL (skipped for InMemory / unit tests).
        if (!db.Database.IsNpgsql())
            return;

        var hash = BitConverter.ToInt64(SHA256.HashData(Encoding.UTF8.GetBytes(lockKey)), 0);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock({0})", [hash], ct);
    }

    public static string? NormalizeKey(string? idempotencyKey)
    {
        var key = idempotencyKey?.Trim();
        return string.IsNullOrEmpty(key) ? null : key;
    }

    /// <summary>
    /// Jedan lock po kupcu (userId / guest email|telefon) — ne po idempotency ključu,
    /// da multi-tab ne može paralelno da kreira više porudžbina.
    /// </summary>
    public static string BuildLockKey(string scope) =>
        $"checkout:{scope.Trim().ToLowerInvariant()}";
}
