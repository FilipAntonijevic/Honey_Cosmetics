using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

public static class ProductCatalogService
{
    public static string NormalizeName(string name) => name.Trim();

    public static bool NamesMatch(string a, string b) =>
        string.Equals(NormalizeName(a), NormalizeName(b), StringComparison.Ordinal);

    public static IQueryable<Product> ActiveProducts(this IQueryable<Product> query) =>
        query.Where(p => !p.IsDeleted);

    public static void ApplyRequest(Product product, ProductRequest request)
    {
        product.Name = NormalizeName(request.Name);
        product.Description = request.Description.Trim();
        product.Price = request.Price;
        product.ImageUrl = request.ImageUrl.Trim();
        product.ProductTypeId = request.ProductTypeId;
        product.CategoryId = request.CategoryId;
        product.UnitCostPrice = request.UnitCostPrice;
        product.UnitTransportCost = request.UnitTransportCost;
    }

    public static async Task<string?> GetActiveNameConflictAsync(
        AppDbContext db,
        string name,
        int? excludeProductId,
        CancellationToken ct = default)
    {
        var normalized = NormalizeName(name);
        var query = db.Products.ActiveProducts().Where(p => p.Name == normalized);
        if (excludeProductId.HasValue)
            query = query.Where(p => p.Id != excludeProductId.Value);

        return await query.AnyAsync(ct)
            ? "Proizvod sa tim imenom već postoji u prodavnici."
            : null;
    }

    /// <summary>
    /// Kreira novi proizvod ili vraća soft-deletovani sa istim imenom u prodavnicu.
    /// </summary>
    public static async Task<(Product Product, bool Restored)> CreateOrRestoreAsync(
        AppDbContext db,
        ProductRequest request,
        CancellationToken ct = default)
    {
        var normalized = NormalizeName(request.Name);

        var softDeleted = await db.Products
            .Include(p => p.AdditionalImages)
            .FirstOrDefaultAsync(p => p.IsDeleted && p.Name == normalized, ct);

        if (softDeleted is not null)
        {
            ApplyRequest(softDeleted, request);
            softDeleted.IsDeleted = false;
            softDeleted.DeletedAt = null;
            softDeleted.IsBestseller = false;
            softDeleted.BestsellerSortOrder = 0;
            return (softDeleted, true);
        }

        var conflict = await GetActiveNameConflictAsync(db, normalized, null, ct);
        if (conflict is not null)
            throw new InvalidOperationException(conflict);

        var product = new Product();
        ApplyRequest(product, request);
        db.Products.Add(product);
        return (product, false);
    }

    public static async Task SoftDeleteAsync(AppDbContext db, Product product, CancellationToken ct = default)
    {
        product.IsDeleted = true;
        product.DeletedAt = DateTime.UtcNow;
        product.IsBestseller = false;
        product.BestsellerSortOrder = 0;

        await db.Carts.Where(c => c.ProductId == product.Id).ExecuteDeleteAsync(ct);
        await db.Wishlists.Where(w => w.ProductId == product.Id).ExecuteDeleteAsync(ct);
    }
}
