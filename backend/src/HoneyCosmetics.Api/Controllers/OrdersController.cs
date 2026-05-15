using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

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

        var cartItems = await db.Carts
            .Where(x => x.UserId == userId)
            .Include(x => x.Product)
            .ToListAsync();

        if (cartItems.Count == 0)
        {
            return BadRequest("Cart is empty.");
        }

        var subtotal = cartItems.Sum(x => x.Quantity * x.Product!.Price);
        decimal discount = 0;
        Coupon? coupon = null;

        if (!string.IsNullOrWhiteSpace(request.CouponCode))
        {
            var code = request.CouponCode.Trim().ToUpperInvariant();
            coupon = await db.Coupons.FirstOrDefaultAsync(x => x.Code.ToUpper() == code && x.IsActive);
            if (coupon is null || (coupon.ExpiresAt.HasValue && coupon.ExpiresAt <= DateTime.UtcNow))
            {
                return BadRequest("Coupon is invalid or expired.");
            }

            var usedByUser = await db.CouponUsages.AnyAsync(x => x.CouponId == coupon.Id && x.UserId == userId);
            if (usedByUser)
            {
                return BadRequest("Coupon already used.");
            }

            if (coupon.FirstOrderOnly && await db.Orders.AnyAsync(x => x.UserId == userId))
            {
                return BadRequest("Coupon available only for first order.");
            }

            discount = coupon.IsPercentage ? subtotal * (coupon.DiscountValue / 100m) : coupon.DiscountValue;
        }

        var total = Math.Max(0, subtotal - discount);

        var order = new Order
        {
            UserId = userId,
            DeliveryAddress = string.IsNullOrWhiteSpace(request.DeliveryAddress) ? user.DefaultAddress ?? string.Empty : request.DeliveryAddress,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? user.PhoneNumber : request.Phone,
            PaymentMethod = request.PaymentMethod,
            Subtotal = subtotal,
            Discount = discount,
            Total = total,
            Status = request.PaymentMethod == PaymentMethod.BankTransfer ? OrderStatus.AwaitingPayment : OrderStatus.Pending,
            Items = cartItems.Select(x => new OrderItem { ProductId = x.ProductId, Quantity = x.Quantity, UnitPrice = x.Product!.Price }).ToList()
        };

        db.Orders.Add(order);
        db.Carts.RemoveRange(cartItems);

        if (coupon is not null)
        {
            db.CouponUsages.Add(new CouponUsage { CouponId = coupon.Id, UserId = userId });
        }

        db.Notifications.Add(new Notification { Message = $"Nova porudžbina #{order.Id} od korisnika {user.FullName}" });

        await db.SaveChangesAsync();

        var settings = sendGridOptions.Value;
        // Build from cartItems — Product nav property is already loaded there
        var orderItems = cartItems.Select(x => (x.Product!.Name, x.Quantity, x.Product.Price)).ToList();
        var couponCode = request.CouponCode?.Trim().ToUpperInvariant();

        logger.LogInformation("[Order {OrderId}] Sending confirmation to user {Email}", order.Id, user.Email);
        // Confirmation to user
        try
        {
            var body = BuildUserConfirmationEmail(
                user.FullName, order.Id, orderItems, order.Subtotal, order.Discount,
                couponCode, order.Total, order.DeliveryAddress, order.Phone,
                order.PaymentMethod.ToString(), order.CreatedAt);
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
                couponCode, order.Total, order.DeliveryAddress, order.Phone,
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

        // Fetch real prices from DB — never trust client
        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await db.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var missingIds = productIds.Except(products.Keys).ToList();
        if (missingIds.Count > 0)
            return BadRequest($"Products not found: {string.Join(", ", missingIds)}");

        if (!string.IsNullOrWhiteSpace(request.CouponCode))
            return BadRequest("Molimo vas da se ulogujete da biste koristili kupon.");

        var subtotal = request.Items.Sum(i => i.Quantity * products[i.ProductId].Price);
        const decimal discount = 0;

        var total = subtotal;

        var order = new Order
        {
            UserId = null,
            GuestName = request.GuestName?.Trim(),
            GuestEmail = request.GuestEmail?.Trim(),
            DeliveryAddress = request.DeliveryAddress.Trim(),
            Phone = request.Phone?.Trim(),
            PaymentMethod = request.PaymentMethod,
            Subtotal = subtotal,
            Discount = discount,
            Total = total,
            Status = request.PaymentMethod == PaymentMethod.BankTransfer ? OrderStatus.AwaitingPayment : OrderStatus.Pending,
            Items = request.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = products[i.ProductId].Price
            }).ToList()
        };

        db.Orders.Add(order);

        db.Notifications.Add(new Notification { Message = $"Nova gost porudžbina #{order.Id}" });

        await db.SaveChangesAsync();

        var settings = sendGridOptions.Value;
        var guestName = order.GuestName ?? "Gost";
        // Build from products dict — Product nav property is not loaded on order.Items
        var orderItemsGuest = request.Items.Select(i => (products[i.ProductId].Name, i.Quantity, products[i.ProductId].Price)).ToList();
        string? couponCodeGuest = null;

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
                        couponCodeGuest,
                        order.Total,
                        order.DeliveryAddress,
                        order.Phone,
                        order.PaymentMethod.ToString(),
                        order.CreatedAt));
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
                    couponCodeGuest,
                    order.Total,
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
        var order = await db.Orders.FindAsync(orderId);
        if (order is null)
        {
            return NotFound();
        }

        order.Status = status;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static OrderResponse MapOrder(Order order) =>
        new(order.Id, order.DeliveryAddress, order.Phone, order.PaymentMethod, order.Status.ToString(), order.Subtotal, order.Discount, order.Total, order.CreatedAt,
            order.Items.Select(x => new OrderItemResponse(x.ProductId, x.Product?.Name ?? string.Empty, x.Product?.ImageUrl, x.Quantity, x.UnitPrice)).ToList());

    // Resolves the inbox where order/shipment notifications should be delivered.
    // Falls back to appsettings SendGrid:AdminEmail when SiteSettings has no value.
    private async Task<string> ResolveNotificationsEmailAsync()
    {
        var s = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        var fromDb = (s?.NotificationsEmail ?? string.Empty).Trim();
        return string.IsNullOrEmpty(fromDb) ? sendGridOptions.Value.AdminEmail : fromDb;
    }

    private static string ItemsTableHtml(List<(string Name, int Qty, decimal Price)> items)
    {
        var rows = string.Concat(items.Select(i => $"""
            <tr>
              <td style="padding:8px 4px;border-bottom:1px solid #f1e5d8;">{i.Name}</td>
              <td style="padding:8px 4px;border-bottom:1px solid #f1e5d8;text-align:center;">{i.Qty}</td>
              <td style="padding:8px 4px;border-bottom:1px solid #f1e5d8;text-align:right;">{(i.Qty * i.Price).ToString("N0")} RSD</td>
            </tr>
            """));
        return $"""
            <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
              <thead>
                <tr style="color:#9b8276;font-size:0.78rem;">
                  <th style="padding:6px 4px;text-align:left;font-weight:500;">Proizvod</th>
                  <th style="padding:6px 4px;text-align:center;font-weight:500;">Kom</th>
                  <th style="padding:6px 4px;text-align:right;font-weight:500;">Cena</th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
            """;
    }

    private static string BuildUserConfirmationEmail(
        string name, int orderId,
        List<(string Name, int Qty, decimal Price)> items,
        decimal subtotal, decimal discount, string? couponCode,
        decimal total, string address, string? phone,
        string paymentMethod, DateTime createdAt)
    {
        var discountRow = discount > 0
            ? $"""<tr><td style="color:#c0392b;padding:3px 0;">Popust{(string.IsNullOrEmpty(couponCode) ? "" : $" ({couponCode})")}</td><td style="text-align:right;color:#c0392b;">&minus;{discount:N0} RSD</td></tr>"""
            : "";
        var phoneRow = string.IsNullOrWhiteSpace(phone)
            ? ""
            : $"""<p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Telefon:</strong> {phone}</p>""";

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
            <tr style="font-weight:700;font-size:1rem;border-top:1px solid #f1e5d8;">
              <td style="padding-top:8px;">Ukupno</td>
              <td style="text-align:right;padding-top:8px;">{total:N0} RSD</td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.2rem 0;">

          <h3 style="color:#3f2b22;font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:0.6rem;">Podaci o dostavi</h3>
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Adresa:</strong> {address}</p>
          {phoneRow}
          <p style="margin:0.3rem 0;font-size:0.9rem;"><strong>Način plaćanja:</strong> {paymentMethod}</p>

          <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.2rem 0;">
          <p style="color:#9b8276;font-size:0.8rem;margin:0;">Ukoliko imate pitanja, slobodno nas kontaktirajte na <a href="mailto:filipdantonijevic@gmail.com" style="color:#3f2b22;">filipdantonijevic@gmail.com</a>.</p>
        </div>
        """;
    }

    private static string BuildAdminNotificationEmail(
        string customerName, string customerEmail, int orderId,
        List<(string Name, int Qty, decimal Price)> items,
        decimal subtotal, decimal discount, string? couponCode,
        decimal total, string address, string? phone,
        string paymentMethod, DateTime createdAt)
    {
        var discountRow = discount > 0
            ? $"""<tr><td style="color:#dc2626;padding:3px 0;">Popust{(string.IsNullOrEmpty(couponCode) ? "" : $" ({couponCode})")}</td><td style="text-align:right;color:#dc2626;">&minus;{discount:N0} RSD</td></tr>"""
            : "";
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
            <tr style="font-weight:700;font-size:1rem;border-top:1px solid #e5e7eb;">
              <td style="padding-top:8px;">Ukupno</td>
              <td style="text-align:right;padding-top:8px;">{total:N0} RSD</td>
            </tr>
          </table>
        </div>
        """;
    }
}
