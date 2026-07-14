using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
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
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
    };

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
            CustomerName = data.CustomerName,
            Phone = data.Phone ?? string.Empty,
            Email = data.Email,
            Address = street,
            City = city ?? string.Empty,
            PostalCode = postalCode ?? string.Empty,
            Country = country ?? string.Empty,
            PaymentMethod = data.PaymentMethod,
            Subtotal = data.Subtotal,
            ShippingPrice = data.ShippingCost,
            Discount = data.Discount,
            Total = data.Total,
            TotalPrice = data.Total,
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
            Items = data.Items.Select(i => new MakeWebhookItemPayload
            {
                Name = i.Name,
                Size = i.Size ?? string.Empty,
                Quantity = i.Quantity,
                Price = i.Price,
            }).ToList(),
        };

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        if (json is "{}" or "[]")
        {
            logger.LogError("Make webhook payload za porudžbinu #{OrderId} je prazan — preskačem slanje", data.OrderId);
            return;
        }

        try
        {
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

            using var response = await httpClient.PostAsync(url, content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "Make webhook za porudžbinu #{OrderId} vratio HTTP {Status}: {Body}. Payload={Payload}",
                    data.OrderId,
                    (int)response.StatusCode,
                    string.IsNullOrWhiteSpace(body) ? "(prazan)" : body,
                    json);
                return;
            }

            logger.LogInformation(
                "Make webhook poslat za porudžbinu #{OrderId}. Payload={Payload}",
                data.OrderId,
                json);
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
}
