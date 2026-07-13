using System.Net.Http.Json;
using System.Text.Json.Serialization;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Infrastructure.Configurations;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HoneyCosmetics.Infrastructure.Services;

public class MakeWebhookService(
    IOptions<MakeWebhookSettings> settings,
    HttpClient httpClient,
    ILogger<MakeWebhookService> logger) : IMakeWebhookService
{
    public async Task NotifyOrderCreatedAsync(MakeOrderWebhookData data, CancellationToken cancellationToken = default)
    {
        var url = settings.Value.WebhookUrl?.Trim();
        if (string.IsNullOrWhiteSpace(url)
            || url.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var (firstName, lastName) = SplitCustomerName(data.CustomerName);
        var (street, city, postalCode, country) = ParseDeliveryAddress(data.FullAddress);
        var payload = new MakeWebhookPayload
        {
            OrderId = data.OrderId,
            OrderNumber = data.OrderId,
            CreatedAt = data.CreatedAtUtc.ToString("yyyy-MM-ddTHH:mm:ss"),
            Customer = new MakeWebhookCustomerPayload
            {
                FirstName = firstName,
                LastName = lastName,
                FullName = data.CustomerName,
                Email = data.Email,
                Phone = data.Phone ?? string.Empty,
            },
            Shipping = new MakeWebhookShippingPayload
            {
                Address = street,
                City = city ?? string.Empty,
                PostalCode = postalCode ?? string.Empty,
                Country = country ?? string.Empty,
            },
            PaymentMethod = data.PaymentMethod,
            Subtotal = data.Subtotal,
            ShippingPrice = data.ShippingCost,
            Discount = data.Discount,
            Total = data.Total,
            Items = data.Items.Select(i => new MakeWebhookItemPayload
            {
                Name = i.Name,
                Size = i.Size ?? string.Empty,
                Quantity = i.Quantity,
                Price = i.Price,
            }).ToList(),
        };

        try
        {
            using var response = await httpClient.PostAsJsonAsync(url, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "Make webhook za porudžbinu #{OrderId} vratio HTTP {Status}: {Body}",
                    data.OrderId,
                    (int)response.StatusCode,
                    string.IsNullOrWhiteSpace(body) ? "(prazan)" : body);
                return;
            }

            logger.LogInformation("Make webhook poslat za porudžbinu #{OrderId}", data.OrderId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Make webhook nije uspeo za porudžbinu #{OrderId}", data.OrderId);
        }
    }

    internal static (string FirstName, string LastName) SplitCustomerName(string fullName)
    {
        var trimmed = fullName.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return (string.Empty, string.Empty);

        var spaceIndex = trimmed.IndexOf(' ');
        if (spaceIndex < 0)
            return (trimmed, string.Empty);

        return (trimmed[..spaceIndex], trimmed[(spaceIndex + 1)..].Trim());
    }

    internal static (string Street, string? City, string? PostalCode, string? Country) ParseDeliveryAddress(string fullAddress)
    {
        if (string.IsNullOrWhiteSpace(fullAddress))
            return (string.Empty, null, null, null);

        var parts = fullAddress
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        if (parts.Count == 0)
            return (fullAddress.Trim(), null, null, null);

        if (parts.Count == 1)
            return (parts[0], null, null, null);

        if (parts.Count == 2)
            return (parts[0], parts[1], null, null);

        if (parts.Count == 3)
        {
            if (IsPostalCode(parts[2]))
                return (parts[0], parts[1], parts[2], null);
            return (parts[0], parts[1], null, parts[2]);
        }

        var postal = IsPostalCode(parts[^1]) ? parts[^1] : null;
        var country = parts.Count >= 4 ? parts[^2] : null;
        var city = parts[1];
        var street = parts[0];
        return (street, city, postal, country);
    }

    private static bool IsPostalCode(string value) =>
        value.Length is >= 4 and <= 10 && value.All(char.IsDigit);

    private sealed class MakeWebhookPayload
    {
        [JsonPropertyName("order_id")]
        public int OrderId { get; set; }

        [JsonPropertyName("order_number")]
        public int OrderNumber { get; set; }

        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; } = string.Empty;

        [JsonPropertyName("customer")]
        public MakeWebhookCustomerPayload Customer { get; set; } = new();

        [JsonPropertyName("shipping")]
        public MakeWebhookShippingPayload Shipping { get; set; } = new();

        [JsonPropertyName("payment_method")]
        public string PaymentMethod { get; set; } = string.Empty;

        [JsonPropertyName("subtotal")]
        public decimal Subtotal { get; set; }

        [JsonPropertyName("shipping_price")]
        public decimal ShippingPrice { get; set; }

        [JsonPropertyName("discount")]
        public decimal Discount { get; set; }

        [JsonPropertyName("total")]
        public decimal Total { get; set; }

        [JsonPropertyName("items")]
        public List<MakeWebhookItemPayload> Items { get; set; } = [];
    }

    private sealed class MakeWebhookCustomerPayload
    {
        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = string.Empty;

        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;

        [JsonPropertyName("full_name")]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("phone")]
        public string Phone { get; set; } = string.Empty;
    }

    private sealed class MakeWebhookShippingPayload
    {
        [JsonPropertyName("address")]
        public string Address { get; set; } = string.Empty;

        [JsonPropertyName("city")]
        public string City { get; set; } = string.Empty;

        [JsonPropertyName("postal_code")]
        public string PostalCode { get; set; } = string.Empty;

        [JsonPropertyName("country")]
        public string Country { get; set; } = string.Empty;
    }

    private sealed class MakeWebhookItemPayload
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("size")]
        public string Size { get; set; } = string.Empty;

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("price")]
        public decimal Price { get; set; }
    }
}
