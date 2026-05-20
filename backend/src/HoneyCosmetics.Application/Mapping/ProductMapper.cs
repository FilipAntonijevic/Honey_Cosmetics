using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;

namespace HoneyCosmetics.Application.Mapping;

public static class ProductMapper
{
    public static ProductResponse ToResponse(Product p, bool includeUnitCost = false) =>
        new(
            p.Id,
            p.Name,
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
            includeUnitCost ? p.UnitCostPrice : null);
}
