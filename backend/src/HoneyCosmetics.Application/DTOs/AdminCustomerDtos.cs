namespace HoneyCosmetics.Application.DTOs;

public record AdminCustomerListItem(
    int Id,
    Guid? UserId,
    string Email,
    string DisplayName,
    bool IsRegistered,
    string? Role,
    string? PhoneNumber,
    int OrderCount,
    decimal TotalSpent,
    int WishlistCount,
    DateTime? RegisteredAt,
    DateTime FirstSeenAt,
    DateTime LastActivityAt);

public record AdminCustomerProductPurchase(
    int ProductId,
    string ProductName,
    string? ImageUrl,
    int TotalQuantity,
    decimal TotalSpent,
    int OrderCount);

public record AdminCustomerWishlistItem(
    int ProductId,
    string ProductName,
    string? ImageUrl,
    decimal Price,
    bool InStock);

public record AdminCustomerCartItem(
    int ProductId,
    string ProductName,
    string? ImageUrl,
    int Quantity,
    decimal Price);

public record AdminCustomerOrderSummary(
    int Id,
    string Status,
    decimal Total,
    int ItemCount,
    DateTime CreatedAt);

public record AdminCustomerDetailResponse(
    int Id,
    Guid? UserId,
    string Email,
    string DisplayName,
    bool IsRegistered,
    string? Role,
    string? PhoneNumber,
    string? Street,
    string? City,
    string? PostalCode,
    string? Country,
    DateTime? RegisteredAt,
    DateTime FirstSeenAt,
    DateTime LastActivityAt,
    int OrderCount,
    int DeliveredOrderCount,
    int CancelledOrderCount,
    decimal TotalSpent,
    decimal AverageOrderValue,
    int CouponsUsed,
    int WishlistCount,
    IReadOnlyCollection<AdminCustomerProductPurchase> ProductPurchases,
    IReadOnlyCollection<AdminCustomerWishlistItem> Wishlist,
    IReadOnlyCollection<AdminCustomerCartItem> Cart,
    IReadOnlyCollection<AdminCustomerOrderSummary> Orders);
