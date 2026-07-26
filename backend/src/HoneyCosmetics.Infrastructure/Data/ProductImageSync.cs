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
        // Omitted means that an older/partial client did not intend to edit the gallery.
        // An explicitly supplied empty list still clears all additional images.
        if (imageUrls is null)
            return;

        var urls = imageUrls
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
}
