using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

public static class CustomerProfileService
{
    public static string NormalizeEmail(string email) =>
        email.Trim().ToLowerInvariant();

    public static async Task UpsertFromUserAsync(
        AppDbContext db,
        User user,
        CancellationToken ct = default)
    {
        var email = NormalizeEmail(user.Email);
        var profile = await db.CustomerProfiles.FirstOrDefaultAsync(c => c.Email == email, ct);
        var now = DateTime.UtcNow;

        if (profile is null)
        {
            profile = new CustomerProfile
            {
                Email = email,
                FirstSeenAt = user.CreatedAt,
            };
            db.CustomerProfiles.Add(profile);
        }

        profile.UserId = user.Id;
        profile.DisplayName = user.FullName;
        profile.PhoneNumber = user.PhoneNumber;
        profile.Street = user.Street;
        profile.City = user.City;
        profile.PostalCode = user.PostalCode;
        profile.Country = user.Country;
        profile.LastActivityAt = now;
    }

    public static async Task UpsertFromGuestOrderAsync(
        AppDbContext db,
        Order order,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(order.GuestEmail))
            return;

        var email = NormalizeEmail(order.GuestEmail);
        var profile = await db.CustomerProfiles.FirstOrDefaultAsync(c => c.Email == email, ct);

        if (profile is null)
        {
            profile = new CustomerProfile
            {
                Email = email,
                FirstSeenAt = order.CreatedAt,
            };
            db.CustomerProfiles.Add(profile);
        }

        if (!string.IsNullOrWhiteSpace(order.GuestName))
            profile.DisplayName = order.GuestName.Trim();

        if (!string.IsNullOrWhiteSpace(order.Phone))
            profile.PhoneNumber = order.Phone.Trim();

        if (order.CreatedAt < profile.FirstSeenAt)
            profile.FirstSeenAt = order.CreatedAt;

        if (order.CreatedAt > profile.LastActivityAt)
            profile.LastActivityAt = order.CreatedAt;
    }

    public static async Task UpsertFromRegisteredOrderAsync(
        AppDbContext db,
        User user,
        Order order,
        CancellationToken ct = default)
    {
        await UpsertFromUserAsync(db, user, ct);

        var email = NormalizeEmail(user.Email);
        var profile = await db.CustomerProfiles.FirstAsync(c => c.Email == email, ct);

        if (order.CreatedAt < profile.FirstSeenAt)
            profile.FirstSeenAt = order.CreatedAt;

        if (order.CreatedAt > profile.LastActivityAt)
            profile.LastActivityAt = order.CreatedAt;
    }

    public static async Task BackfillAsync(AppDbContext db, CancellationToken ct = default)
    {
        var users = await db.Users.AsNoTracking().ToListAsync(ct);
        foreach (var user in users)
        {
            var email = NormalizeEmail(user.Email);
            if (await db.CustomerProfiles.AnyAsync(c => c.Email == email, ct))
                continue;

            db.CustomerProfiles.Add(new CustomerProfile
            {
                Email = email,
                UserId = user.Id,
                DisplayName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                Street = user.Street,
                City = user.City,
                PostalCode = user.PostalCode,
                Country = user.Country,
                FirstSeenAt = user.CreatedAt,
                LastActivityAt = user.CreatedAt,
            });
        }

        await db.SaveChangesAsync(ct);

        var registeredEmails = await db.Users
            .AsNoTracking()
            .Select(u => u.Email.ToLower())
            .ToListAsync(ct);
        var registeredSet = registeredEmails.ToHashSet(StringComparer.Ordinal);

        var guestGroups = await db.Orders
            .AsNoTracking()
            .Where(o => o.UserId == null && o.GuestEmail != null && o.GuestEmail != "")
            .GroupBy(o => o.GuestEmail!.Trim().ToLower())
            .Select(g => new
            {
                Email = g.Key,
                DisplayName = g.OrderByDescending(o => o.CreatedAt)
                    .Select(o => o.GuestName)
                    .FirstOrDefault(),
                Phone = g.OrderByDescending(o => o.CreatedAt)
                    .Select(o => o.Phone)
                    .FirstOrDefault(),
                FirstSeenAt = g.Min(o => o.CreatedAt),
                LastActivityAt = g.Max(o => o.CreatedAt),
            })
            .ToListAsync(ct);

        foreach (var guest in guestGroups)
        {
            if (registeredSet.Contains(guest.Email))
                continue;

            if (await db.CustomerProfiles.AnyAsync(c => c.Email == guest.Email, ct))
                continue;

            db.CustomerProfiles.Add(new CustomerProfile
            {
                Email = guest.Email,
                DisplayName = string.IsNullOrWhiteSpace(guest.DisplayName) ? guest.Email : guest.DisplayName.Trim(),
                PhoneNumber = guest.Phone,
                FirstSeenAt = guest.FirstSeenAt,
                LastActivityAt = guest.LastActivityAt,
            });
        }

        await db.SaveChangesAsync(ct);

        foreach (var user in users)
        {
            var email = NormalizeEmail(user.Email);
            var profile = await db.CustomerProfiles.FirstOrDefaultAsync(c => c.Email == email, ct);
            if (profile is null || profile.UserId.HasValue)
                continue;

            profile.UserId = user.Id;
            profile.DisplayName = user.FullName;
            profile.PhoneNumber ??= user.PhoneNumber;
            profile.Street ??= user.Street;
            profile.City ??= user.City;
            profile.PostalCode ??= user.PostalCode;
            profile.Country ??= user.Country;
        }

        await db.SaveChangesAsync(ct);
    }
}
