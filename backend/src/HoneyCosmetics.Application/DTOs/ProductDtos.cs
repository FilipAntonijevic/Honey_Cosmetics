using System.ComponentModel.DataAnnotations;

namespace HoneyCosmetics.Application.DTOs;


public record ProductRequest(
    [Required] string Name,
    string Description,
    [Range(0.01, 9999999)] decimal Price,
    string ImageUrl,
    int ProductTypeId,
    int? CategoryId,
    IReadOnlyList<string>? AdditionalImageUrls = null,
    [Range(0, 1000000)] int StockQuantity = 0,
    [Range(0, 9999999)] decimal? UnitCostPrice = null);

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
    int StockQuantity,
    int OrderedQuantity,
    bool InStock,
    DateTime CreatedAt,
    IReadOnlyList<string>? AdditionalImageUrls = null,
    decimal? UnitCostPrice = null);

public record BestsellersUpdateRequest(IReadOnlyList<int> ProductIds);

public record ProductQuery(string? Search, int? CategoryId, string? Sort);

public record AdminCategoryResponse(int Id, string Name, string ImageUrl, int ProductTypeId, string ProductTypeName);

public record PublicCategoryResponse(int Id, string Name, string ImageUrl, int ProductTypeId, int ProductCount);

public record CategoryUpsertRequest(
    [Required] string Name,
    [Required] string ImageUrl,
    [Required] int ProductTypeId);

public record ProductTypeResponse(int Id, string Name);

public record SiteLinksResponse(
    string InstagramUrl,
    string TikTokUrl,
    string EmailAddress,
    string PhoneNumber,
    string ComplaintsEmail,
    string WhatsAppNumber,
    string ViberNumber,
    string NotificationsEmail);

public record SiteLinksUpdateRequest(
    string? InstagramUrl,
    string? TikTokUrl,
    string? EmailAddress,
    string? PhoneNumber,
    string? ComplaintsEmail,
    string? WhatsAppNumber,
    string? ViberNumber,
    string? NotificationsEmail);
