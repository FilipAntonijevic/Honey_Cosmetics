using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Application.DTOs;

public record CartItemRequest(int ProductId, int Quantity);
public record CheckoutRequest(string? DeliveryAddress, string? Phone, PaymentMethod PaymentMethod, string? CouponCode);
public record GuestCheckoutRequest(
    IReadOnlyList<CartItemRequest> Items,
    string DeliveryAddress,
    string? Phone,
    PaymentMethod PaymentMethod,
    string? CouponCode,
    string? GuestName,
    string? GuestEmail);

public record OrderItemResponse(int ProductId, string ProductName, string? ImageUrl, int Quantity, decimal UnitPrice);

public record OrderResponse(int Id, string DeliveryAddress, string? Phone, PaymentMethod PaymentMethod, string Status, decimal Subtotal, decimal Discount, string? CouponCode, decimal Total, DateTime CreatedAt, IReadOnlyCollection<OrderItemResponse> Items);

public record CouponRequest(string Code, decimal DiscountValue, bool IsPercentage, DateTime? ExpiresAt, bool FirstOrderOnly);
public record CouponValidationResponse(bool IsValid, string Message, decimal DiscountValue, bool IsPercentage);
