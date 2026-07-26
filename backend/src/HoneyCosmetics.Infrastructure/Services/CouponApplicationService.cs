using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

public static class CouponApplicationService
{
    public static async Task DeactivateExpiredCouponsAsync(AppDbContext db)
    {
        var changed = false;

        var expired = await db.Coupons
            .Where(c => c.IsActive && c.ExpiresAt != null && c.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync();

        foreach (var coupon in expired)
        {
            coupon.IsActive = false;
            changed = true;
        }

        var exhaustedOnceTotal = await db.Coupons
            .Where(c => c.IsActive
                && c.UsageLimit == CouponUsageLimit.OnceTotal
                && c.Usages.Any())
            .ToListAsync();

        foreach (var coupon in exhaustedOnceTotal)
        {
            coupon.IsActive = false;
            changed = true;
        }

        if (changed)
            await db.SaveChangesAsync();
    }

    public static async Task<Coupon?> FindActiveCouponAsync(AppDbContext db, string code)
    {
        await DeactivateExpiredCouponsAsync(db);

        var normalized = code.Trim().ToUpperInvariant();
        return await db.Coupons.FirstOrDefaultAsync(x => x.Code.ToUpper() == normalized && x.IsActive);
    }

    public static bool IsExpired(Coupon coupon) =>
        coupon.ExpiresAt.HasValue && coupon.ExpiresAt <= DateTime.UtcNow;

    /// <summary>
    /// Zaključava red kupona u transakciji pa ponovo proverava eligibility (sprečava race).
    /// </summary>
    public static async Task<string?> LockAndGetEligibilityErrorAsync(
        AppDbContext db,
        Coupon coupon,
        Guid? userId,
        CancellationToken ct = default)
    {
        // Row locks exist only on PostgreSQL (skipped for InMemory / unit tests).
        if (db.Database.IsNpgsql())
        {
            await db.Database.ExecuteSqlRawAsync(
                """SELECT 1 FROM "Coupons" WHERE "Id" = {0} FOR UPDATE""",
                [coupon.Id],
                ct);

            await db.Entry(coupon).ReloadAsync(ct);
            if (!coupon.IsActive || IsExpired(coupon))
                return "Kupon je nevažeći ili je istekao.";
        }
        else if (!coupon.IsActive || IsExpired(coupon))
        {
            return "Kupon je nevažeći ili je istekao.";
        }

        return await GetEligibilityErrorAsync(db, coupon, userId);
    }

    public static async Task<string?> GetEligibilityErrorAsync(
        AppDbContext db,
        Coupon coupon,
        Guid? userId)
    {
        if (IsExpired(coupon))
            return "Kupon je istekao.";

        switch (coupon.UsageLimit)
        {
            case CouponUsageLimit.OncePerUser:
                if (userId is null)
                    return "Molimo vas da se ulogujete da biste koristili kupon.";

                if (await db.CouponUsages.AnyAsync(x => x.CouponId == coupon.Id && x.UserId == userId))
                    return "Kupon je već iskorišćen.";
                break;

            case CouponUsageLimit.OnceTotal:
                if (await db.CouponUsages.AnyAsync(x => x.CouponId == coupon.Id))
                    return "Kupon je već iskorišćen.";
                break;
        }

        return null;
    }

    public static void RecordCouponUsage(AppDbContext db, Coupon coupon, Guid? userId)
    {
        switch (coupon.UsageLimit)
        {
            case CouponUsageLimit.Unlimited:
                return;
            case CouponUsageLimit.OncePerUser when userId is not null:
                db.CouponUsages.Add(new CouponUsage { CouponId = coupon.Id, UserId = userId });
                break;
            case CouponUsageLimit.OnceTotal:
                // UserId uvek null — unique indeks IX_CouponUsages_CouponId (WHERE UserId IS NULL)
                // garantuje jednu upotrebu ukupno, nezavisno od ulogovanog/gosta.
                db.CouponUsages.Add(new CouponUsage { CouponId = coupon.Id, UserId = null });
                coupon.IsActive = false;
                break;
        }
    }

    public static decimal CalculateDiscount(Coupon coupon, decimal subtotal)
    {
        var discount = coupon.IsPercentage
            ? subtotal * (coupon.DiscountValue / 100m)
            : coupon.DiscountValue;
        return Math.Round(discount, 2, MidpointRounding.AwayFromZero);
    }
}
