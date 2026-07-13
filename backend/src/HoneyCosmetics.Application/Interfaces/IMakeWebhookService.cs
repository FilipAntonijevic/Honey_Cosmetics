namespace HoneyCosmetics.Application.Interfaces;

public record MakeOrderWebhookLineItem(
    string Name,
    int Quantity,
    string? Size,
    decimal Price);

public record MakeOrderWebhookData(
    int OrderId,
    DateTime CreatedAtUtc,
    string CustomerName,
    string Email,
    string? Phone,
    string FullAddress,
    string PaymentMethod,
    decimal Subtotal,
    decimal Discount,
    decimal ShippingCost,
    decimal Total,
    IReadOnlyList<MakeOrderWebhookLineItem> Items);

public interface IMakeWebhookService
{
    Task NotifyOrderCreatedAsync(MakeOrderWebhookData data, CancellationToken cancellationToken = default);
}
