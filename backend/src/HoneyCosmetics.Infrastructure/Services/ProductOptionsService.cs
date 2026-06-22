using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

/// <summary>
/// Usklađuje opcije (gramaže) jedne grupe varijanti sa unosom iz admin editora.
/// Svaka opcija je i dalje poseban Product red (zbog lagera/finansija/porudžbina),
/// ali admin ih vidi i uređuje kao jednu listu unutar proizvoda.
/// </summary>
public static class ProductOptionsService
{
    private sealed class Opt
    {
        public int? Id;
        public string Label = string.Empty;
        public decimal Price;
        public bool IsDefault;
        public int SortOrder;
    }

    public static async Task<(string? Error, Product? Default)> ReconcileAsync(
        AppDbContext db,
        Product anchor,
        ProductRequest request,
        bool allowReuseAnchor,
        CancellationToken ct = default)
    {
        if (request.Options is null || request.Options.Count == 0)
            return (null, null);

        var opts = new List<Opt>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var o in request.Options)
        {
            var label = ProductVariantService.NormalizeVariantLabel(o.Label);
            if (string.IsNullOrWhiteSpace(label))
                return ("Svaka opcija mora imati gramazu (npr. 15ml).", null);
            if (!seen.Add(label))
                return ($"Gramaza \"{label}\" je navedena više puta.", null);
            if (o.Price <= 0)
                return ("Cena svake opcije mora biti veća od 0.", null);
            opts.Add(new Opt { Id = o.Id, Label = label, Price = o.Price, IsDefault = o.IsDefault, SortOrder = o.SortOrder });
        }

        // Tačno jedna podrazumevana opcija.
        var firstDefault = opts.FirstOrDefault(o => o.IsDefault) ?? opts[0];
        foreach (var o in opts)
            o.IsDefault = ReferenceEquals(o, firstDefault);

        var groupId = anchor.VariantGroupId ?? anchor.Id;

        var existing = await db.Products
            .Include(p => p.AdditionalImages)
            .Where(p => !p.IsDeleted && (p.Id == groupId || p.VariantGroupId == groupId))
            .ToListAsync(ct);
        var existingById = existing.ToDictionary(p => p.Id);

        var single = opts.Count == 1;

        // Na kreiranju ponovo iskoristi tek napravljeni anchor red za prvu opciju.
        Product? reusableAnchor = null;
        if (allowReuseAnchor
            && existingById.ContainsKey(anchor.Id)
            && opts.All(o => o.Id != anchor.Id))
        {
            reusableAnchor = anchor;
        }

        var anchorImageUrls = (request.AdditionalImageUrls ?? Array.Empty<string>())
            .Select(u => u.Trim())
            .Where(u => u.Length > 0)
            .ToList();

        var keptIds = new HashSet<int>();
        var resultRows = new List<Product>();
        Product? defaultRow = null;

        foreach (var o in opts)
        {
            Product row;
            if (o.Id is int oid && existingById.TryGetValue(oid, out var found))
            {
                row = found;
                keptIds.Add(row.Id);
            }
            else if (reusableAnchor is not null)
            {
                row = reusableAnchor;
                reusableAnchor = null;
                keptIds.Add(row.Id);
            }
            else
            {
                row = new Product { CreatedAt = DateTime.UtcNow };
                db.Products.Add(row);
            }

            // Zajednička polja proizvoda (sa anchor-a).
            row.Name = anchor.Name;
            row.Description = anchor.Description;
            row.ImageUrl = anchor.ImageUrl;
            row.ProductTypeId = anchor.ProductTypeId;
            row.CategoryId = anchor.CategoryId;

            // Polja specifična za opciju.
            row.Price = o.Price;
            row.VariantLabel = o.Label;
            row.IsDefaultVariant = o.IsDefault;
            row.VariantSortOrder = o.SortOrder > 0
                ? o.SortOrder
                : ProductVariantService.VariantSortKey(o.Label);
            row.VariantGroupId = single ? null : groupId;

            resultRows.Add(row);
            if (o.IsDefault)
                defaultRow = row;
        }

        // Uklonjene opcije: soft-delete + skini grupu/labelu da ne bi rušila unique indeks.
        foreach (var ex in existing)
        {
            if (keptIds.Contains(ex.Id))
                continue;
            ex.VariantGroupId = null;
            ex.VariantLabel = null;
            ex.IsDefaultVariant = false;
            await ProductCatalogService.SoftDeleteAsync(db, ex, ct);
        }

        await db.SaveChangesAsync(ct);

        // Iste slike na svim opcijama (da galerija bude ista bez obzira na gramazu).
        foreach (var row in resultRows)
            await db.SyncAdditionalImagesAsync(row.Id, anchorImageUrls, ct);

        await db.SaveChangesAsync(ct);

        return (null, defaultRow ?? resultRows.FirstOrDefault());
    }
}
