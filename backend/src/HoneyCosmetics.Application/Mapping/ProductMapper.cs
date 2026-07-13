using HoneyCosmetics.Application;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;

namespace HoneyCosmetics.Application.Mapping;

public static class ProductMapper
{
    public static ProductVariantOption ToVariantOption(Product p) =>
        new(
            p.Id,
            p.VariantLabel?.Trim()
                ?? ProductDisplayNaming.TryExtractVariantLabel(p.Name)
                ?? string.Empty,
            p.Price,
            p.StockQuantity > 0,
            p.StockQuantity,
            p.IsDefaultVariant,
            p.VariantSortOrder);

    public static ProductResponse ToResponse(
        Product p,
        bool includeUnitCost = false,
        IReadOnlyList<Product>? siblings = null)
    {
        IReadOnlyList<ProductVariantOption>? variants = null;
        if (siblings is { Count: > 1 })
            variants = siblings.Select(ToVariantOption).ToList();

        return new ProductResponse(
            p.Id,
            ProductDisplayNaming.GetDisplayName(p),
            p.Description,
            p.Price,
            p.ImageUrl,
            p.ProductTypeId,
            p.ProductType != null ? p.ProductType.Name : string.Empty,
            p.CategoryId,
            p.Category != null ? p.Category.Name : string.Empty,
            p.IsBestseller,
            p.BestsellerSortOrder,
            p.StockQuantity,
            p.OrderedQuantity,
            p.StockQuantity > 0,
            p.CreatedAt,
            p.AdditionalImages
                .OrderBy(x => x.SortOrder)
                .Select(x => x.ImageUrl)
                .ToList(),
            includeUnitCost ? p.UnitCostPrice : null,
            includeUnitCost ? p.UnitTransportCost : null,
            p.VariantGroupId,
            p.VariantLabel,
            p.VariantSortOrder,
            variants,
            p.IsDefaultVariant);
    }

    /// <summary>Admin editor: raw DB name, variant labels resolved, all options listed.</summary>
    public static ProductResponse ToAdminResponse(
        Product p,
        IReadOnlyList<Product>? siblings = null)
    {
        var resolvedSiblings = siblings is { Count: > 0 } ? siblings : new[] { p };
        var variants = resolvedSiblings.Count > 0
            ? resolvedSiblings.Select(ToVariantOption).ToList()
            : null;
        var resolvedVariantLabel = p.VariantLabel?.Trim()
            ?? ProductDisplayNaming.TryExtractVariantLabel(p.Name);

        return new ProductResponse(
            p.Id,
            p.Name.Trim(),
            p.Description,
            p.Price,
            p.ImageUrl,
            p.ProductTypeId,
            p.ProductType != null ? p.ProductType.Name : string.Empty,
            p.CategoryId,
            p.Category != null ? p.Category.Name : string.Empty,
            p.IsBestseller,
            p.BestsellerSortOrder,
            p.StockQuantity,
            p.OrderedQuantity,
            p.StockQuantity > 0,
            p.CreatedAt,
            p.AdditionalImages
                .OrderBy(x => x.SortOrder)
                .Select(x => x.ImageUrl)
                .ToList(),
            p.UnitCostPrice,
            p.UnitTransportCost,
            p.VariantGroupId,
            resolvedVariantLabel,
            p.VariantSortOrder,
            variants,
            p.IsDefaultVariant);
    }
}
