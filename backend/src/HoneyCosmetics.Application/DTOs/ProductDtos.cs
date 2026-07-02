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
    [Range(0, 9999999)] decimal? UnitCostPrice = null,
    [Range(0, 9999999)] decimal? UnitTransportCost = null,
    int? VariantGroupId = null,
    string? VariantLabel = null,
    int VariantSortOrder = 0,
    IReadOnlyList<ProductOptionInput>? Options = null);

/// <summary>Jedna opcija (gramaza) proizvoda koju admin unosi u editoru opcija.</summary>
public record ProductOptionInput(
    int? Id,
    string? Label,
    [Range(0.01, 9999999)] decimal Price,
    bool IsDefault = false,
    int SortOrder = 0);

public record ProductVariantOption(
    int Id,
    string VariantLabel,
    decimal Price,
    bool InStock,
    int StockQuantity,
    bool IsDefault = false,
    int SortOrder = 0);

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
    decimal? UnitCostPrice = null,
    decimal? UnitTransportCost = null,
    int? VariantGroupId = null,
    string? VariantLabel = null,
    int VariantSortOrder = 0,
    IReadOnlyList<ProductVariantOption>? Variants = null,
    bool IsDefaultVariant = false);

public record BestsellersUpdateRequest(IReadOnlyList<int> ProductIds);

public record ProductQuery(string? Search, int? CategoryId, int? ProductTypeId, string? Sort, int? Page = null, int PageSize = 12);

public record PagedProductResponse(
    IReadOnlyList<ProductResponse> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore);

public record AdminProductListItemResponse(
    int Id,
    string Name,
    string ImageUrl,
    string ProductType,
    string? Category,
    int TotalStock,
    int VariantCount);

public record PagedAdminProductsResponse(
    IReadOnlyList<AdminProductListItemResponse> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasMore);

public record AdminCategoryResponse(int Id, string Name, string ImageUrl, int ProductTypeId, string ProductTypeName, int SortOrder);

public record CategoryReorderRequest(int ProductTypeId, IReadOnlyList<int> CategoryIds);

public record PublicCategoryResponse(int Id, string Name, string ImageUrl, int ProductTypeId, int ProductCount);

public record CategoryUpsertRequest(
    [Required] string Name,
    [Required] string ImageUrl,
    [Required] int ProductTypeId);

public record CategoryProductsUpdateRequest(IReadOnlyList<int> ProductIds);

public record ProductTypeResponse(int Id, string Name);

public record SiteLinksResponse(
    string InstagramUrl,
    string TikTokUrl,
    string EmailAddress,
    string InfoEmails,
    string ContactEmail,
    string MarketingEmail,
    string OfficeEmail,
    string PhoneNumber,
    string ComplaintsEmail,
    string WhatsAppNumber,
    string ViberNumber,
    string NotificationsEmail,
    decimal FreeShippingThreshold,
    decimal ShippingCost,
    string NotificationBannerText,
    bool NotificationBannerEnabled,
    string BankTransferRecipientName,
    string BankTransferRecipientAddress,
    string BankTransferAccountNumber,
    string BankTransferBankName,
    string BankTransferPurpose);

public record SiteLinksUpdateRequest(
    string? InstagramUrl,
    string? TikTokUrl,
    string? EmailAddress,
    string? InfoEmails,
    string? ContactEmail,
    string? MarketingEmail,
    string? OfficeEmail,
    string? PhoneNumber,
    string? ComplaintsEmail,
    string? WhatsAppNumber,
    string? ViberNumber,
    string? NotificationsEmail,
    decimal? FreeShippingThreshold,
    decimal? ShippingCost,
    string? BankTransferRecipientName,
    string? BankTransferRecipientAddress,
    string? BankTransferAccountNumber,
    string? BankTransferBankName,
    string? BankTransferPurpose);

public record NotificationBannerUpdateRequest(
    [Required, MaxLength(2000)] string Text,
    bool Enabled);
