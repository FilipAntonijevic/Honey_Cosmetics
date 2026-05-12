using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController(AppDbContext db, IEmailService emailService) : ControllerBase
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
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? user.Phone : request.Phone,
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

        await emailService.SendAsync(
            "admin@honeycosmetics.local",
            "Nova porudžbina",
            $"Kupac: {user.FullName}, Telefon: {order.Phone}, Adresa: {order.DeliveryAddress}, Ukupno: {order.Total}, Plaćanje: {order.PaymentMethod}");

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
            order.Items.Select(x => new OrderItemResponse(x.ProductId, x.Product?.Name ?? string.Empty, x.Quantity, x.UnitPrice)).ToList());
}
