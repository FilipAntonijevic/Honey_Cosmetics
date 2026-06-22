using HoneyCosmetics.Application;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;

namespace HoneyCosmetics.Application.Mapping;

public static class ProductMapper
{
    public static ProductVariantOption ToVariantOption(Product p) =>
        new(
            p.Id,
            p.VariantLabel ?? string.Empty,
            p.Price,
            p.StockQuantity > 0,
            p.StockQuantity);

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
            variants);
    }
}
