using System.ComponentModel.DataAnnotations;
using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Application.DTOs;

public record CartItemRequest(int ProductId, int Quantity);
public record CheckoutRequest(
    string? DeliveryAddress,
    string? Phone,
    PaymentMethod PaymentMethod,
    string? CouponCode,
    string? CustomerNote,
    string? InstagramHandle,
    [param: Required, StringLength(128, MinimumLength = 1)] string IdempotencyKey);
public record GuestCheckoutRequest(
    IReadOnlyList<CartItemRequest> Items,
    string DeliveryAddress,
    string? Phone,
    PaymentMethod PaymentMethod,
    string? CouponCode,
    string? GuestName,
    string? GuestEmail,
    string? CustomerNote,
    string? InstagramHandle,
    [param: Required, StringLength(128, MinimumLength = 1)] string IdempotencyKey);

public record OrderItemResponse(
    int ProductId,
    string ProductName,
    string? VariantLabel,
    string? ImageUrl,
    int Quantity,
    decimal UnitPrice);

public record OrderResponse(int Id, string DeliveryAddress, string? Phone, PaymentMethod PaymentMethod, string Status, bool IsPaid, decimal Subtotal, decimal Discount, string? CouponCode, decimal ShippingCost, decimal Total, bool FreeShippingApplied, DateTime CreatedAt, IReadOnlyCollection<OrderItemResponse> Items);

public record CouponRequest(string Code, decimal DiscountValue, bool IsPercentage, DateTime? ExpiresAt, CouponUsageLimit UsageLimit);
public record CouponValidationResponse(bool IsValid, string Message, decimal DiscountValue, bool IsPercentage);
