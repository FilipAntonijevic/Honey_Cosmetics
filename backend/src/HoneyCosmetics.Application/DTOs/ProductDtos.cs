using System.ComponentModel.DataAnnotations;

namespace HoneyCosmetics.Application.DTOs;


public record ProductRequest(
    [Required] string Name,
    string Description,
    [Range(0.01, 9999999)] decimal Price,
    string ImageUrl,
    int ProductTypeId,
    int? CategoryId);

public record ProductResponse(
    int Id,
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    int ProductTypeId,
    string ProductType,
    int? CategoryId,
    string Category,
    bool IsBestseller,
    int BestsellerSortOrder,
    DateTime CreatedAt);

public record BestsellersUpdateRequest(IReadOnlyList<int> ProductIds);

public record ProductQuery(string? Search, int? CategoryId, string? Sort);

public record AdminCategoryResponse(int Id, string Name, string ImageUrl, int ProductTypeId, string ProductTypeName);

public record PublicCategoryResponse(int Id, string Name, string ImageUrl, int ProductTypeId, int ProductCount);

public record CategoryUpsertRequest(
    [Required] string Name,
    [Required] string ImageUrl,
    [Required] int ProductTypeId);

public record ProductTypeResponse(int Id, string Name);
