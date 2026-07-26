using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Tests;

public class OrdersControllerTests
{
    [Fact]
    public async Task Guest_checkout_creates_order_and_decrements_stock()
    {
        using var fx = new OrdersTestFixture();
        var product = fx.SeedProduct(price: 2500m, stock: 5);

        var result = await fx.Controller.GuestCheckout(new GuestCheckoutRequest(
            Items: [new CartItemRequest(product.Id, 2)],
            DeliveryAddress: "Nemanjina 10, Beograd",
            Phone: "+38160111222",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: null,
            GuestName: "Ana Petrović",
            GuestEmail: "ana@example.com",
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<OrderResponse>(ok.Value);
        Assert.Equal(5000m, order.Subtotal);
        Assert.Equal(0m, order.Discount);
        Assert.Equal(430m, order.ShippingCost);
        Assert.Equal(5430m, order.Total);
        Assert.Equal(nameof(OrderStatus.Pending), order.Status);
        Assert.Single(order.Items);

        var persisted = await fx.Db.Orders.Include(o => o.Items).SingleAsync();
        Assert.Equal("Ana Petrović", persisted.GuestName);
        Assert.Equal(2, persisted.Items.Single().Quantity);

        var stock = await fx.Db.Products.Where(p => p.Id == product.Id).Select(p => p.StockQuantity).SingleAsync();
        Assert.Equal(3, stock);
    }

    [Fact]
    public async Task Registered_checkout_creates_order_from_cart()
    {
        using var fx = new OrdersTestFixture();
        var user = fx.SeedUser();
        var product = fx.SeedProduct(price: 1800m, stock: 8);
        fx.AddToCart(user, product, quantity: 1);
        fx.AuthenticateAs(user);

        var result = await fx.Controller.Checkout(new CheckoutRequest(
            DeliveryAddress: null,
            Phone: "0612223333",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: null,
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<OrderResponse>(ok.Value);
        Assert.Equal(1800m, order.Subtotal);
        Assert.Equal(2230m, order.Total);
        Assert.False(await fx.Db.Carts.AnyAsync(c => c.UserId == user.Id));
        Assert.True(await fx.Db.Orders.AnyAsync(o => o.UserId == user.Id && o.Id == order.Id));
    }

    [Fact]
    public async Task Guest_checkout_sends_confirmation_email_to_customer()
    {
        using var fx = new OrdersTestFixture();
        var product = fx.SeedProduct();
        var guestEmail = "gost@example.com";

        var result = await fx.Controller.GuestCheckout(new GuestCheckoutRequest(
            Items: [new CartItemRequest(product.Id, 1)],
            DeliveryAddress: "Bulevar 5, Novi Sad",
            Phone: "+38163444555",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: null,
            GuestName: "Gost Kupac",
            GuestEmail: guestEmail,
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        Assert.IsType<OkObjectResult>(result.Result);

        var customerMail = Assert.Single(fx.Email.Sent, m => m.To == guestEmail);
        Assert.StartsWith("Honey Cosmetics — Potvrda porudžbine #", customerMail.Subject);
        Assert.Contains("Gost Kupac", customerMail.Body);
    }

    [Fact]
    public async Task Guest_checkout_sends_notification_email_to_admin_inboxes()
    {
        using var fx = new OrdersTestFixture(
            notificationsEmail: "admin1@honey-cosmetic.com, admin2@honey-cosmetic.com");
        var product = fx.SeedProduct();

        var result = await fx.Controller.GuestCheckout(new GuestCheckoutRequest(
            Items: [new CartItemRequest(product.Id, 1)],
            DeliveryAddress: "Cara Dušana 2, Niš",
            Phone: "+381611234567",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: null,
            GuestName: "Ivana Marković",
            GuestEmail: "ivana@example.com",
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        Assert.IsType<OkObjectResult>(result.Result);

        var adminMails = fx.Email.Sent
            .Where(m => m.Subject.StartsWith("Honey Cosmetics — Nova porudžbina #", StringComparison.Ordinal))
            .ToList();

        Assert.Equal(2, adminMails.Count);
        Assert.Contains(adminMails, m => m.To == "admin1@honey-cosmetic.com");
        Assert.Contains(adminMails, m => m.To == "admin2@honey-cosmetic.com");
        Assert.All(adminMails, m => Assert.Contains("Ivana Marković", m.Body));
    }

    [Fact]
    public async Task Registered_checkout_sends_emails_to_user_and_admins()
    {
        using var fx = new OrdersTestFixture(notificationsEmail: "orders@honey-cosmetic.com");
        var user = fx.SeedUser(email: "kupac@example.com", firstName: "Petar", lastName: "Nikolić");
        var product = fx.SeedProduct();
        fx.AddToCart(user, product);
        fx.AuthenticateAs(user);

        var result = await fx.Controller.Checkout(new CheckoutRequest(
            DeliveryAddress: "Terazije 1, Beograd",
            Phone: "0649998888",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: null,
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        Assert.IsType<OkObjectResult>(result.Result);

        var userMail = Assert.Single(fx.Email.Sent, m => m.To == user.Email);
        Assert.StartsWith("Honey Cosmetics — Potvrda porudžbine #", userMail.Subject);

        var adminMail = Assert.Single(fx.Email.Sent, m => m.To == "orders@honey-cosmetic.com");
        Assert.StartsWith("Honey Cosmetics — Nova porudžbina #", adminMail.Subject);
        Assert.Contains("Petar Nikolić", adminMail.Body);
    }

    [Fact]
    public async Task Checkout_applies_percentage_coupon_to_order_total()
    {
        using var fx = new OrdersTestFixture();
        var user = fx.SeedUser();
        var product = fx.SeedProduct(price: 2000m, stock: 5);
        fx.SeedCoupon(code: "SAVE10", discountValue: 10m, isPercentage: true);
        fx.AddToCart(user, product, quantity: 2);
        fx.AuthenticateAs(user);

        var result = await fx.Controller.Checkout(new CheckoutRequest(
            DeliveryAddress: "Kneza Miloša 8, Beograd",
            Phone: "0621112222",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: "save10",
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<OrderResponse>(ok.Value);
        Assert.Equal(4000m, order.Subtotal);
        Assert.Equal(400m, order.Discount);
        Assert.Equal("SAVE10", order.CouponCode);
        Assert.Equal(4030m, order.Total); // 3600 + 430 shipping
    }

    [Fact]
    public async Task Checkout_rejects_invalid_coupon()
    {
        using var fx = new OrdersTestFixture();
        var user = fx.SeedUser();
        var product = fx.SeedProduct();
        fx.AddToCart(user, product);
        fx.AuthenticateAs(user);

        var result = await fx.Controller.Checkout(new CheckoutRequest(
            DeliveryAddress: "Adresa 1",
            Phone: "0610001111",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: "NEPOSTOJI",
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Coupon is invalid or expired.", bad.Value);
        Assert.False(await fx.Db.Orders.AnyAsync());
    }

    [Fact]
    public async Task Guest_checkout_rejects_empty_cart()
    {
        using var fx = new OrdersTestFixture();

        var result = await fx.Controller.GuestCheckout(new GuestCheckoutRequest(
            Items: [],
            DeliveryAddress: "Adresa 1",
            Phone: "0610001111",
            PaymentMethod: PaymentMethod.CashOnDelivery,
            CouponCode: null,
            GuestName: "Test",
            GuestEmail: "t@example.com",
            CustomerNote: null,
            InstagramHandle: null,
            IdempotencyKey: Guid.NewGuid().ToString("N")));

        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Cart is empty.", bad.Value);
    }
}
