using HoneyCosmetics.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Data;

public static class ProductImageSync
{
    public static async Task SyncAdditionalImagesAsync(
        this AppDbContext db,
        int productId,
        IReadOnlyList<string>? imageUrls,
        CancellationToken cancellationToken = default)
    {
        var urls = (imageUrls ?? Array.Empty<string>())
            .Select(u => u.Trim())
            .Where(u => u.Length > 0)
            .ToList();

        var existing = await db.ProductImages
            .Where(x => x.ProductId == productId)
            .ToListAsync(cancellationToken);

        db.ProductImages.RemoveRange(existing);

        for (var i = 0; i < urls.Count; i++)
        {
            db.ProductImages.Add(new ProductImage
            {
                ProductId = productId,
                ImageUrl = urls[i],
                SortOrder = i,
            });
        }
    }

    public static async Task<IReadOnlyList<string>> GetAdditionalImageUrlsAsync(
        this AppDbContext db,
        int productId,
        CancellationToken cancellationToken = default) =>
        await db.ProductImages
            .AsNoTracking()
            .Where(x => x.ProductId == productId)
            .OrderBy(x => x.SortOrder)
            .Select(x => x.ImageUrl)
            .ToListAsync(cancellationToken);
}
