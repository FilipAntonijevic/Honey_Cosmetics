using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Net;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController(
    AppDbContext db,
    IEmailService emailService,
    IOptions<SendGridSettings> sendGridOptions,
    ILogger<OrdersController> logger) : ControllerBase
{
    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyCollection<OrderResponse>>> MyOrders()
    {
        var userId = User.GetUserId();
        var orders = await db.Orders
            .Where(x => x.UserId == userId)
            .Include(x => x.Items)
            .ThenInclude(x => x.Product)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(MapOrder));
    }

    [HttpPost("checkout")]
    public async Task<ActionResult<OrderResponse>> Checkout(CheckoutRequest request)
    {
        var userId = User.GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null)
        {
            return Unauthorized();
        }

        var allCartItems = await db.Carts
            .Where(x => x.UserId == userId)
            .Include(x => x.Product)
            .ToListAsync();

        if (allCartItems.Count == 0)
        {
            return BadRequest("Cart is empty.");
        }

        var unavailable = allCartItems
            .Where(x => x.Product is null || x.Product.IsDeleted || x.Product.StockQuantity <= 0)
            .ToList();
        if (unavailable.Count > 0)
            db.Carts.RemoveRange(unavailable);

        var cartItems = allCartItems.Except(unavailable).ToList();
        foreach (var item in cartItems)
        {
            var stock = item.Product!.StockQuantity;
            if (item.Quantity > stock)
                item.Quantity = stock;
        }

        cartItems = cartItems.Where(x => x.Quantity > 0).ToList();

        if (cartItems.Count == 0)
        {
            if (unavailable.Count > 0)
                await db.SaveChangesAsync();
            return BadRequest("Nema proizvoda na stanju u korpi.");
        }

        if (!TryNormalizeOrderPhone(request.Phone, out var phone))
        {
            return BadRequest("Broj telefona je obavezan.");
        }

        var subtotal = cartItems.Sum(x => x.Quantity * x.Product!.Price);
        decimal discount = 0;
        Coupon? coupon = null;

        if (!string.IsNullOrWhiteSpace(request.CouponCode))
        {
            coupon = await CouponApplicationService.FindActiveCouponAsync(db, request.CouponCode);
            if (coupon is null || CouponApplicationService.IsExpired(coupon))
            {
                return BadRequest("Coupon is invalid or expired.");
            }

            var couponError = await CouponApplicationService.GetEligibilityErrorAsync(db, coupon, userId);
            if (couponError is not null)
            {
                return BadRequest(couponError);
            }

            discount = CouponApplicationService.CalculateDiscount(coupon, subtotal);
        }

        var itemsTotal = Math.Max(0, subtotal - discount);

        var (freeShippingThreshold, standardShippingCost) = await GetShippingSettingsAsync();
        var freeShippingApplied = freeShippingThreshold > 0 && itemsTotal >= freeShippingThreshold;
        var shippingCost = freeShippingApplied ? 0m : standardShippingCost;
        var total = itemsTotal + shippingCost;

        var stockError = await InventoryFinanceService.ValidateAndApplyStockForOrderAsync(
            db,
            cartItems.Select(x => (x.ProductId, x.Quantity)));
        if (stockError is not null)
            return BadRequest(stockError);

        var order = new Order
        {
            UserId = userId,
            DeliveryAddress = string.IsNullOrWhiteSpace(request.DeliveryAddress) ? user.DefaultAddress ?? string.Empty : request.DeliveryAddress,
            Phone = phone,
            PaymentMethod = request.PaymentMethod,
            Subtotal = subtotal,
            Discount = discount,
            CouponCode = coupon?.Code,
            ShippingCost = shippingCost,
            Total = total,
            FreeShippingApplied = freeShippingApplied,
            Status = OrderStatus.Pending,
            Items = cartItems.Select(x => new OrderItem
            {
                ProductId = x.ProductId,
                Quantity = x.Quantity,
                UnitPrice = x.Product!.Price,
                VariantLabel = x.Product.VariantLabel,
            }).ToList()
        };

        db.Orders.Add(order);
        db.Carts.RemoveRange(allCartItems);

        if (coupon is not null)
            CouponApplicationService.RecordCouponUsage(db, coupon, userId);

        await db.SaveChangesAsync();

        await CustomerProfileService.UpsertFromRegisteredOrderAsync(db, user, order);
        await db.SaveChangesAsync();

        var settings = sendGridOptions.Value;
        // Build from cartItems — Product nav property is already loaded there
        var orderItems = cartItems.Select(x => (
            ProductVariantService.GetDisplayName(x.Product!),
            x.Product!.VariantLabel,
            x.Quantity,
            x.Product!.Price)).ToList();

        logger.LogInformation("[Order {OrderId}] Sending confirmation to user {Email}", order.Id, user.Email);
        var contactEmail = await ResolveContactEmailAsync();
        var siteSettingsForEmail = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        var bankSlipHtml = TryBuildBankTransferSlipHtml(siteSettingsForEmail, order.PaymentMethod, order.Id, order.Total);
        // Confirmation to user
        try
        {
            var body = BuildUserConfirmationEmail(
                user.FullName, order.Id, orderItems, order.Subtotal, order.Discount,
                order.CouponCode, order.Total, order.ShippingCost, order.FreeShippingApplied, order.DeliveryAddress, order.Phone,
                order.PaymentMethod.ToString(), order.CreatedAt, contactEmail, bankSlipHtml);
            await emailService.SendAsync(user.Email, $"Honey Cosmetics — Potvrda porudžbine #{order.Id}", body);
            logger.LogInformation("[Order {OrderId}] User email sent OK", order.Id);
        }
        catch (Exception ex) { logger.LogError(ex, "[Order {OrderId}] User email FAILED: {Msg}", order.Id, ex.Message); }

        var notificationsEmail = await ResolveNotificationsEmailAsync();
        logger.LogInformation("[Order {OrderId}] Sending notification to admin {AdminEmail}", order.Id, notificationsEmail);
        // Notification to admin
        try
        {
            var body = BuildAdminNotificationEmail(
                user.FullName, user.Email, order.Id, orderItems, order.Subtotal, order.Discount,
                order.CouponCode, order.Total, order.ShippingCost, order.FreeShippingApplied, order.DeliveryAddress, order.Phone,
                order.PaymentMethod.ToString(), order.CreatedAt);
            await emailService.SendAsync(notificationsEmail, $"Nova porudžbina #{order.Id} — {user.FullName}", body);
            logger.LogInformation("[Order {OrderId}] Admin email sent OK", order.Id);
        }
        catch (Exception ex) { logger.LogError(ex, "[Order {OrderId}] Admin email FAILED: {Msg}", order.Id, ex.Message); }

        return Ok(MapOrder(order));
    }

    [AllowAnonymous]
    [HttpPost("guest-checkout")]
    public async Task<ActionResult<OrderResponse>> GuestCheckout(GuestCheckoutRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest("Cart is empty.");

        if (string.IsNullOrWhiteSpace(request.DeliveryAddress))
            return BadRequest("Delivery address is required.");

        if (!TryNormalizeOrderPhone(request.Phone, out var guestPhone))
            return BadRequest("Broj telefona je obavezan.");

        // Fetch real prices from DB — never trust client
        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await db.Products
            .ActiveProducts()
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var missingIds = productIds.Except(products.Keys).ToList();
        if (missingIds.Count > 0)
            return BadRequest($"Products not found: {string.Join(", ", missingIds)}");

        var subtotal = request.Items.Sum(i => i.Quantity * products[i.ProductId].Price);
        decimal discount = 0;
        Coupon? coupon = null;

        if (!string.IsNullOrWhiteSpace(request.CouponCode))
        {
            coupon = await CouponApplicationService.FindActiveCouponAsync(db, request.CouponCode);
            if (coupon is null || CouponApplicationService.IsExpired(coupon))
            {
                return BadRequest("Coupon is invalid or expired.");
            }

            var couponError = await CouponApplicationService.GetEligibilityErrorAsync(db, coupon, userId: null);
            if (couponError is not null)
            {
                return BadRequest(couponError);
            }

            discount = CouponApplicationService.CalculateDiscount(coupon, subtotal);
        }

        var itemsTotal = Math.Max(0, subtotal - discount);

        var (freeShippingThreshold, standardShippingCost) = await GetShippingSettingsAsync();
        var freeShippingApplied = freeShippingThreshold > 0 && itemsTotal >= freeShippingThreshold;
        var shippingCost = freeShippingApplied ? 0m : standardShippingCost;
        var total = itemsTotal + shippingCost;

        var stockError = await InventoryFinanceService.ValidateAndApplyStockForOrderAsync(
            db,
            request.Items.Select(i => (i.ProductId, i.Quantity)));
        if (stockError is not null)
            return BadRequest(stockError);

        var order = new Order
        {
            UserId = null,
            GuestName = request.GuestName?.Trim(),
            GuestEmail = request.GuestEmail?.Trim(),
            DeliveryAddress = request.DeliveryAddress.Trim(),
            Phone = guestPhone,
            PaymentMethod = request.PaymentMethod,
            Subtotal = subtotal,
            Discount = discount,
            CouponCode = coupon?.Code,
            ShippingCost = shippingCost,
            Total = total,
            FreeShippingApplied = freeShippingApplied,
            Status = OrderStatus.Pending,
            Items = request.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = products[i.ProductId].Price,
                VariantLabel = products[i.ProductId].VariantLabel,
            }).ToList()
        };

        db.Orders.Add(order);

        if (coupon is not null)
            CouponApplicationService.RecordCouponUsage(db, coupon, userId: null);

        await db.SaveChangesAsync();

        await CustomerProfileService.UpsertFromGuestOrderAsync(db, order);

        var settings = sendGridOptions.Value;
        var guestName = order.GuestName ?? "Gost";
        // Build from products dict — Product nav property is not loaded on order.Items
        var orderItemsGuest = request.Items.Select(i => (
            ProductVariantService.GetDisplayName(products[i.ProductId]),
            products[i.ProductId].VariantLabel,
            i.Quantity,
            products[i.ProductId].Price)).ToList();
        var contactEmailGuest = await ResolveContactEmailAsync();
        var siteSettingsForGuestEmail = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        var bankSlipHtmlGuest = TryBuildBankTransferSlipHtml(siteSettingsForGuestEmail, order.PaymentMethod, order.Id, order.Total);
        // Confirmation to guest
        if (!string.IsNullOrWhiteSpace(order.GuestEmail))
        {
            try
            {
                await emailService.SendAsync(
                    order.GuestEmail,
                    $"Honey Cosmetics — Potvrda porudžbine #{order.Id}",
                    BuildUserConfirmationEmail(
                        guestName,
                        order.Id,
                        orderItemsGuest,
                        order.Subtotal,
                        order.Discount,
                        order.CouponCode,
                        order.Total,
                        order.ShippingCost,
                        order.FreeShippingApplied,
                        order.DeliveryAddress,
                        order.Phone,
                        order.PaymentMethod.ToString(),
                        order.CreatedAt,
                        contactEmailGuest,
                        bankSlipHtmlGuest));
            }
            catch (Exception ex) { logger.LogError(ex, "Failed to send guest confirmation email for order {OrderId}", order.Id); }
        }

        var notificationsEmailGuest = await ResolveNotificationsEmailAsync();
        // Notification to admin
        try
        {
            await emailService.SendAsync(
                notificationsEmailGuest,
                $"Nova gost porudžbina #{order.Id} — {guestName}",
                BuildAdminNotificationEmail(
                    guestName,
                    order.GuestEmail ?? "—",
                    order.Id,
                    orderItemsGuest,
                    order.Subtotal,
                    order.Discount,
                    order.CouponCode,
                    order.Total,
                    order.ShippingCost,
                    order.FreeShippingApplied,
                    order.DeliveryAddress,
                    order.Phone,
                    order.PaymentMethod.ToString(),
                    order.CreatedAt));
        }
        catch (Exception ex) { logger.LogError(ex, "Failed to send admin notification email for guest order {OrderId}", order.Id); }

        return Ok(MapOrder(order));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<OrderResponse>>> All([FromQuery] string? status, [FromQuery] string? search)
    {
        var query = db.Orders
            .Include(x => x.Items).ThenInclude(x => x.Product)
            .Include(x => x.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(x => x.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalized = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.User!.FullName.ToLower().Contains(normalized) || x.User.Email.ToLower().Contains(normalized));
        }

        var orders = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(orders.Select(MapOrder));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{orderId:int}/status")]
    public async Task<IActionResult> UpdateStatus(int orderId, [FromBody] OrderStatus status)
    {
        var order = await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);
        if (order is null)
            return NotFound();

        var error = await OrderStatusWorkflow.TryApplyStatusChangeAsync(db, order, status);
        if (error is not null)
            return BadRequest(error);

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static OrderResponse MapOrder(Order order) =>
        new(order.Id, order.DeliveryAddress, order.Phone, order.PaymentMethod, order.Status.ToString(), order.Subtotal, order.Discount, order.CouponCode, order.ShippingCost, order.Total, order.FreeShippingApplied, order.CreatedAt,
            order.Items.Select(MapOrderItem).ToList());

    private static OrderItemResponse MapOrderItem(OrderItem item) =>
        new(
            item.ProductId,
            ProductVariantService.GetDisplayName(item.Product?.Name ?? string.Empty, item.VariantLabel ?? item.Product?.VariantLabel),
            item.VariantLabel ?? item.Product?.VariantLabel,
            item.Product?.ImageUrl,
            item.Quantity,
            item.UnitPrice);

    private async Task<(decimal FreeShippingThreshold, decimal ShippingCost)> GetShippingSettingsAsync()
    {
        var s = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        var threshold = s?.FreeShippingThreshold ?? 10000m;
        var shippingCost = s?.ShippingCost ?? 430m;
        return (
            threshold > 0 ? threshold : 0,
            shippingCost > 0 ? shippingCost : 0);
    }

    private static string BuildShippingRowHtml(bool freeShippingApplied, decimal shippingCost) =>
        freeShippingApplied
            ? """<tr><td style="color:#16a34a;padding:3px 0;">Dostava</td><td style="text-align:right;color:#16a34a;font-weight:600;">Besplatna</td></tr>"""
            : shippingCost > 0
                ? $"""<tr><td style="padding:3px 0;">Poštarina</td><td style="text-align:right;">+{shippingCost:N0} RSD</td></tr>"""
                : "";

    // Resolves the inbox where order/shipment notifications should be delivered.
    // Falls back to appsettings SendGrid:AdminEmail when SiteSettings has no value.
    private async Task<string> ResolveNotificationsEmailAsync()
    {
        var s = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        var fromDb = (s?.NotificationsEmail ?? string.Empty).Trim();
        return string.IsNullOrEmpty(fromDb) ? sendGridOptions.Value.AdminEmail : fromDb;
    }

    private async Task<string> ResolveContactEmailAsync()
    {
        var s = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        var fromDb = (s?.EmailAddress ?? string.Empty).Trim();
        return string.IsNullOrEmpty(fromDb) ? sendGridOptions.Value.AdminEmail : fromDb;
    }

    private static string ItemsTableHtml(List<(string Name, string? VariantLabel, int Qty, decimal Price)> items)
    {
        var rows = string.Concat(items.Select(i =>
        {
            var variantCell = string.IsNullOrWhiteSpace(i.VariantLabel)
                ? "—"
                : WebUtility.HtmlEncode(i.VariantLabel);
            return $"""
            <tr>
              <td style="padding:8px 4px;border-bottom:1px solid #f1e5d8;">{WebUtility.HtmlEncode(i.Name)}</td>
              <td style="padding:8px 4px;border-bottom:1px solid #f1e5d8;text-align:center;">{variantCell}</td>
              <td style="padding:8px 4px;border-bottom:1px solid #f1e5d8;text-align:center;">{i.Qty}</td>
              <td style="padding:8px 4px;border-bottom:1px solid #f1e5d8;text-align:right;">{(i.Qty * i.Price).ToString("N0")} RSD</td>
            </tr>
            """;
        }));
        return $"""
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
              <thead>
                <tr style="color:#9b8276;font-size:0.78rem;">
                  <th style="padding:6px 4px;text-align:left;font-weight:500;">Proizvod</th>
                  <th style="padding:6px 4px;text-align:center;font-weight:500;">Gramaza</th>
                  <th style="padding:6px 4px;text-align:center;font-weight:500;">Kom</th>
                  <th style="padding:6px 4px;text-align:right;font-weight:500;">Cena</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
            """;
    }

    /// <summary>Minimum: pozivni + bar još nekoliko cifara (npr. +381 60…).</summary>
    private static bool TryNormalizeOrderPhone(string? phone, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(phone))
            return false;

        normalized = phone.Trim();
        var digitsOnly = new string(normalized.Where(char.IsDigit).ToArray());
        if (digitsOnly.Length <= 3 || normalized == "+")
            return false;

        return true;
    }

    private static string FormatPaymentMethodLabel(string paymentMethod) =>
        paymentMethod switch
        {
            nameof(PaymentMethod.BankTransfer) => "Direktna bankovna transakcija",
            nameof(PaymentMethod.CashOnDelivery) => "Plaćanje pouzećem",
            _ => paymentMethod
        };

    private static string? TryBuildBankTransferSlipHtml(SiteSettings? settings, PaymentMethod paymentMethod, int orderId, decimal total)
    {
        if (paymentMethod != PaymentMethod.BankTransfer || settings is null)
            return null;

        var recipient = settings.BankTransferRecipientName?.Trim();
        var account = settings.BankTransferAccountNumber?.Trim();
        if (string.IsNullOrEmpty(recipient) || string.IsNullOrEmpty(account))
            return null;

        var address = settings.BankTransferRecipientAddress?.Trim();
        var purposeBase = string.IsNullOrWhiteSpace(settings.BankTransferPurpose)
            ? "Uplata porudžbine"
            : settings.BankTransferPurpose.Trim();

        var encodedRecipient = WebUtility.HtmlEncode(recipient);
        var encodedAccount = WebUtility.HtmlEncode(account);
        var encodedPurpose = WebUtility.HtmlEncode(purposeBase);
        var encodedAddress = string.IsNullOrWhiteSpace(address) ? null : WebUtility.HtmlEncode(address);
        var amountText = total.ToString("N2", System.Globalization.CultureInfo.GetCultureInfo("sr-Latn-RS"));

        var addressRow = encodedAddress is null
            ? ""
            : $"""
              <tr>
                <td style="padding:6px 0;color:#8b7668;font-weight:600;vertical-align:top;width:38%;">Adresa primaoca</td>
                <td style="padding:6px 0;color:#3f2b22;vertical-align:top;">{encodedAddress}</td>
              </tr>
              """;

        return $"""
          <div style="background:#fff8eb;border:1px solid #f0d9a8;border-radius:8px;padding:1rem 1.2rem;margin:1.2rem 0;">
            <h3 style="color:#3f2b22;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 0.65rem;">Podaci za uplatu</h3>
            <p style="margin:0 0 0.85rem;font-size:0.88rem;line-height:1.55;color:#5c4a3a;">
              Unesite ove podatke u uplatnicu / e-banking. Porudžbina se šalje tek nakon evidentirane uplate.
              <strong>Obavezno upišite broj porudžbine u polje „Poziv na broj”.</strong>
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
              <tr>
                <td style="padding:6px 0;color:#8b7668;font-weight:600;vertical-align:top;width:38%;">Primalac</td>
                <td style="padding:6px 0;color:#3f2b22;vertical-align:top;"><strong>{encodedRecipient}</strong></td>
              </tr>
              {addressRow}
              <tr>
                <td style="padding:6px 0;color:#8b7668;font-weight:600;vertical-align:top;">Broj računa</td>
                <td style="padding:6px 0;color:#3f2b22;vertical-align:top;font-family:Consolas,Monaco,monospace;"><strong>{encodedAccount}</strong></td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#8b7668;font-weight:600;vertical-align:top;">Iznos</td>
                <td style="padding:6px 0;color:#3f2b22;vertical-align:top;"><strong>{amountText} RSD</strong></td>
              </tr>
              <tr style="background:#fff3d6;">
                <td style="padding:10px 8px;color:#7c4a03;font-weight:700;vertical-align:top;border-radius:6px 0 0 6px;">Poziv na broj</td>
                <td style="padding:10px 8px;color:#7c4a03;font-weight:700;vertical-align:top;font-size:1.05rem;border-radius:0 6px 6px 0;">#{orderId}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#8b7668;font-weight:600;vertical-align:top;">Svrha uplate</td>
                <td style="padding:6px 0;color:#3f2b22;vertical-align:top;">{encodedPurpose} — <strong>#{orderId}</strong></td>
              </tr>
            </table>
            <p style="margin:0.85rem 0 0;font-size:0.84rem;line-height:1.5;color:#7c4a03;">
              U polje <strong>„Poziv na broj”</strong> na uplatnici obavezno unesite <strong>#{orderId}</strong>.
            </p>
          </div>
          """;
    }

    private static string BuildUserConfirmationEmail(
        string name, int orderId,
        List<(string Name, string? VariantLabel, int Qty, decimal Price)> items,
        decimal subtotal, decimal discount, string? couponCode,
        decimal total, decimal shippingCost, bool freeShippingApplied, string address, string? phone,
        string paymentMethod, DateTime createdAt, string contactEmail,
        string? bankTransferSlipHtml = null)
    {
        var discountRow = discount > 0
            ? $"""<tr><td style="color:#c0392b;padding:3px 0;">Popust{(string.IsNullOrEmpty(couponCode) ? "" : $" ({couponCode})")}</td><td style="text-align:right;color:#c0392b;">&minus;{discount:N0} RSD</td></tr>"""
            : "";
        var shippingRow = BuildShippingRowHtml(freeShippingApplied, shippingCost);
        var phoneRow = string.IsNullOrWhiteSpace(phone)
            ? ""
            : $"""<p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Telefon:</strong> {phone}</p>""";
        var encodedContact = WebUtility.HtmlEncode(contactEmail);
        var paymentLabel = FormatPaymentMethodLabel(paymentMethod);
        var bankSlipSection = string.IsNullOrEmpty(bankTransferSlipHtml)
            ? ""
            : bankTransferSlipHtml;

        return $"""
        <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#fff;padding:2rem;border:1px solid #f1e5d8;border-radius:12px;">
          <h2 style="color:#3f2b22;margin-bottom:0;">Honey Cosmetics</h2>
          <p style="color:#9b8276;font-size:0.82rem;margin-top:0.2rem;">Premium Beauty</p>
          <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.2rem 0;">

          <p style="font-size:1rem;">Zdravo <strong>{name}</strong>,</p>
          <p style="color:#3f2b22;">Hvala na porudžbini! Potvrđujemo da smo primili vašu porudžbinu.</p>

          <div style="background:#fdf9f5;border:1px solid #f1e5d8;border-radius:8px;padding:1rem 1.2rem;margin:1.2rem 0;">
            <p style="margin:0 0 0.3rem;font-size:0.78rem;color:#9b8276;letter-spacing:0.08em;text-transform:uppercase;">Broj porudžbine</p>
            <p style="margin:0;font-size:1.1rem;font-weight:700;color:#3f2b22;">#{orderId}</p>
            <p style="margin:0.4rem 0 0;font-size:0.8rem;color:#b09888;">{createdAt:dd.MM.yyyy HH:mm}</p>
          </div>

          <h3 style="color:#3f2b22;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.5rem;">Poručeno</h3>
          {ItemsTableHtml(items)}

          <table style="width:100%;margin-top:1rem;font-size:0.9rem;">
            <tr><td style="color:#6b6b6b;padding:3px 0;">Međuzbir</td><td style="text-align:right;">{subtotal:N0} RSD</td></tr>
            {discountRow}
            {shippingRow}
            <tr style="font-weight:700;font-size:1rem;border-top:1px solid #f1e5d8;">
              <td style="padding-top:8px;">Ukupno</td>
              <td style="text-align:right;padding-top:8px;">{total:N0} RSD</td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.2rem 0;">

          <h3 style="color:#3f2b22;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.6rem;">Podaci o dostavi</h3>
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Adresa:</strong> {address}</p>
          {phoneRow}
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Način plaćanja:</strong> {paymentLabel}</p>

          {bankSlipSection}

          <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.2rem 0;">
          <p style="color:#9b8276;font-size:0.8rem;margin:0;">Ukoliko imate pitanja, slobodno nas kontaktirajte na <a href="mailto:{encodedContact}" style="color:#3f2b22;">{encodedContact}</a>.</p>
        </div>
        """;
    }

    private static string BuildAdminNotificationEmail(
        string customerName, string customerEmail, int orderId,
        List<(string Name, string? VariantLabel, int Qty, decimal Price)> items,
        decimal subtotal, decimal discount, string? couponCode,
        decimal total, decimal shippingCost, bool freeShippingApplied, string address, string? phone,
        string paymentMethod, DateTime createdAt)
    {
        var discountRow = discount > 0
            ? $"""<tr><td style="color:#dc2626;padding:3px 0;">Popust{(string.IsNullOrEmpty(couponCode) ? "" : $" ({couponCode})")}</td><td style="text-align:right;color:#dc2626;">&minus;{discount:N0} RSD</td></tr>"""
            : "";
        var shippingRow = BuildShippingRowHtml(freeShippingApplied, shippingCost);
        var phoneRow = string.IsNullOrWhiteSpace(phone)
            ? ""
            : $"""<p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Telefon:</strong> {phone}</p>""";

        return $"""
        <div style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#fff;padding:2rem;border:1px solid #ddd;border-radius:12px;">
          <h2 style="color:#1a1a2e;margin-bottom:0;">Nova porudžbina #{orderId}</h2>
          <p style="color:#6b7280;font-size:0.82rem;margin-top:0.2rem;">{createdAt:dd.MM.yyyy HH:mm}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:1.2rem 0;">

          <h3 style="font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;color:#374151;margin-bottom:0.6rem;">Podaci o kupcu</h3>
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Ime i prezime:</strong> {customerName}</p>
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Email:</strong> <a href="mailto:{customerEmail}" style="color:#1a1a2e;">{customerEmail}</a></p>
          {phoneRow}
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Adresa:</strong> {address}</p>
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Način plaćanja:</strong> {paymentMethod}</p>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:1.2rem 0;">

          <h3 style="font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;color:#374151;margin-bottom:0.6rem;">Poručeni artikli</h3>
          {ItemsTableHtml(items)}

          <table style="width:100%;margin-top:1rem;font-size:0.9rem;">
            <tr><td style="color:#6b7280;padding:3px 0;">Međuzbir</td><td style="text-align:right;">{subtotal:N0} RSD</td></tr>
            {discountRow}
            {shippingRow}
            <tr style="font-weight:700;font-size:1rem;border-top:1px solid #e5e7eb;">
              <td style="padding-top:8px;">Ukupno</td>
              <td style="text-align:right;padding-top:8px;">{total:N0} RSD</td>
            </tr>
          </table>
        </div>
        """;
    }
}
