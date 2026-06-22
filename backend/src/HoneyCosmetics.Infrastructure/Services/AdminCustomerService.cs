using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

public static class AdminCustomerService
{
    private static readonly OrderStatus[] ExcludedRevenueStatuses =
        [OrderStatus.Cancelled, OrderStatus.Returned];

    public static async Task<IReadOnlyCollection<AdminCustomerListItem>> GetListAsync(
        AppDbContext db,
        string? search,
        CancellationToken ct = default)
    {
        var query = db.CustomerProfiles
            .AsNoTracking()
            .Include(c => c.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.Email.Contains(term) ||
                c.DisplayName.ToLower().Contains(term) ||
                (c.PhoneNumber != null && c.PhoneNumber.ToLower().Contains(term)));
        }

        var profiles = await query
            .OrderByDescending(c => c.LastActivityAt)
            .ToListAsync(ct);

        if (profiles.Count == 0)
            return [];

        var emails = profiles.Select(p => p.Email).ToList();
        var userIds = profiles
            .Where(p => p.UserId.HasValue)
            .Select(p => p.UserId!.Value)
            .ToList();

        var orders = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o =>
                (o.UserId != null && userIds.Contains(o.UserId.Value))
                || (o.UserId == null && o.GuestEmail != null && emails.Contains(o.GuestEmail.ToLower())))
            .ToListAsync(ct);

        var wishlistCounts = userIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await db.Wishlists
                .AsNoTracking()
                .Where(w => userIds.Contains(w.UserId))
                .GroupBy(w => w.UserId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

        return profiles.Select(profile =>
        {
            var profileOrders = OrdersForProfile(profile, orders);
            var revenueOrders = profileOrders
                .Where(o => !ExcludedRevenueStatuses.Contains(o.Status))
                .ToList();

            var wishlistCount = profile.UserId is Guid uid && wishlistCounts.TryGetValue(uid, out var wc)
                ? wc
                : 0;

            var orderCount = profile.ImportedOrderCount + profileOrders.Count;
            var totalSpent = profile.ImportedTotalSpent + revenueOrders.Sum(o => o.Total);

            return new AdminCustomerListItem(
                profile.Id,
                profile.UserId,
                profile.Email,
                profile.DisplayName,
                profile.UserId.HasValue,
                profile.User?.Role.ToString(),
                profile.PhoneNumber,
                orderCount,
                totalSpent,
                wishlistCount,
                profile.User?.CreatedAt,
                profile.FirstSeenAt,
                profile.LastActivityAt);
        }).ToList();
    }

    public static async Task<AdminCustomerDetailResponse?> GetDetailAsync(
        AppDbContext db,
        int profileId,
        CancellationToken ct = default)
    {
        var profile = await db.CustomerProfiles
            .AsNoTracking()
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == profileId, ct);

        if (profile is null)
            return null;

        var orders = await db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .Where(o =>
                (profile.UserId != null && o.UserId == profile.UserId)
                || (o.UserId == null && o.GuestEmail != null && o.GuestEmail.ToLower() == profile.Email))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync(ct);

        var revenueOrders = orders
            .Where(o => !ExcludedRevenueStatuses.Contains(o.Status))
            .ToList();

        var productPurchases = orders
            .SelectMany(o => o.Items.Select(i => new { Order = o, Item = i }))
            .GroupBy(x => x.Item.ProductId)
            .Select(g =>
            {
                var first = g.First();
                var product = first.Item.Product;
                var counted = g.Where(x => !ExcludedRevenueStatuses.Contains(x.Order.Status));
                return new AdminCustomerProductPurchase(
                    g.Key,
                    ProductVariantService.GetDisplayName(product?.Name ?? "—", product?.VariantLabel),
                    product?.VariantLabel,
                    product?.ImageUrl,
                    counted.Sum(x => x.Item.Quantity),
                    counted.Sum(x => x.Item.Quantity * x.Item.UnitPrice),
                    g.Select(x => x.Order.Id).Distinct().Count());
            })
            .OrderByDescending(p => p.TotalSpent)
            .ToList();

        IReadOnlyCollection<AdminCustomerWishlistItem> wishlist = [];
        IReadOnlyCollection<AdminCustomerCartItem> cart = [];
        var couponsUsed = 0;

        if (profile.UserId is Guid userId)
        {
            wishlist = (await db.Wishlists
                .AsNoTracking()
                .Where(w => w.UserId == userId)
                .Include(w => w.Product)
                .OrderByDescending(w => w.Id)
                .ToListAsync(ct))
                .Select(w => new AdminCustomerWishlistItem(
                    w.ProductId,
                    ProductVariantService.GetDisplayName(w.Product!),
                    w.Product!.VariantLabel,
                    w.Product.ImageUrl,
                    w.Product.Price,
                    w.Product.StockQuantity > 0))
                .ToList();

            cart = (await db.Carts
                .AsNoTracking()
                .Where(c => c.UserId == userId)
                .Include(c => c.Product)
                .ToListAsync(ct))
                .Select(c => new AdminCustomerCartItem(
                    c.ProductId,
                    ProductVariantService.GetDisplayName(c.Product!),
                    c.Product!.VariantLabel,
                    c.Product.ImageUrl,
                    c.Quantity,
                    c.Product.Price))
                .ToList();

            couponsUsed = await db.CouponUsages
                .AsNoTracking()
                .CountAsync(u => u.UserId == userId, ct);
        }

        var orderSummaries = orders.Select(o => new AdminCustomerOrderSummary(
            o.Id,
            o.Status.ToString(),
            o.Total,
            o.Items.Sum(i => i.Quantity),
            o.CreatedAt)).ToList();

        var totalSpent = profile.ImportedTotalSpent + revenueOrders.Sum(o => o.Total);
        var orderCount = profile.ImportedOrderCount + orders.Count;

        return new AdminCustomerDetailResponse(
            profile.Id,
            profile.UserId,
            profile.Email,
            profile.DisplayName,
            profile.UserId.HasValue,
            profile.User?.Role.ToString(),
            profile.PhoneNumber,
            profile.Street ?? profile.User?.Street,
            profile.City ?? profile.User?.City,
            profile.PostalCode ?? profile.User?.PostalCode,
            profile.Country ?? profile.User?.Country,
            profile.User?.CreatedAt,
            profile.FirstSeenAt,
            profile.LastActivityAt,
            orderCount,
            orders.Count(o => o.Status == OrderStatus.Delivered),
            orders.Count(o => o.Status is OrderStatus.Cancelled or OrderStatus.Returned),
            totalSpent,
            orderCount > 0 ? Math.Round(totalSpent / orderCount, 2) : 0,
            couponsUsed,
            wishlist.Count,
            productPurchases,
            wishlist,
            cart,
            orderSummaries);
    }

    private static List<Order> OrdersForProfile(CustomerProfile profile, IEnumerable<Order> orders) =>
        orders.Where(o =>
            (profile.UserId != null && o.UserId == profile.UserId)
            || (o.UserId == null && o.GuestEmail != null
                && CustomerProfileService.NormalizeEmail(o.GuestEmail) == profile.Email))
            .ToList();
}
