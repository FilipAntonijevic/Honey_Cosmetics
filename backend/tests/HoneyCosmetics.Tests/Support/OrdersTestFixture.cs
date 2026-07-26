using System.Security.Claims;
using HoneyCosmetics.Api.Controllers;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HoneyCosmetics.Tests.Support;

internal sealed class OrdersTestFixture : IDisposable
{
    public AppDbContext Db { get; }
    public CapturingEmailService Email { get; }
    public OrdersController Controller { get; }
    public CouponsController CouponsController { get; }

    public OrdersTestFixture(
        string adminEmail = "admin@honey-cosmetic.com",
        string? notificationsEmail = "admin@honey-cosmetic.com,ops@honey-cosmetic.com")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"orders-tests-{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        Db = new AppDbContext(options);
        Email = new CapturingEmailService();

        Db.SiteSettings.Add(new SiteSettings
        {
            Id = 1,
            NotificationsEmail = notificationsEmail ?? string.Empty,
            FreeShippingThreshold = 10000m,
            ShippingCost = 430m,
        });
        Db.SaveChanges();

        var brevo = Options.Create(new BrevoSettings
        {
            ApiKey = "test-key",
            FromEmail = "noreply@honey-cosmetic.com",
            FromName = "Honey Cosmetics",
            AdminEmail = adminEmail,
        });

        Controller = new OrdersController(
            Db,
            Email,
            new NoOpMakeWebhookService(),
            brevo,
            NullLogger<OrdersController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };

        CouponsController = new CouponsController(Db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };
    }

    public ProductType SeedProductType(string name = "Nega")
    {
        var type = new ProductType { Name = name };
        Db.ProductTypes.Add(type);
        Db.SaveChanges();
        return type;
    }

    public Product SeedProduct(
        string name = "Medeni balzam",
        decimal price = 2000m,
        int stock = 10,
        string imageUrl = "/images/test-product.webp",
        int? productTypeId = null)
    {
        var typeId = productTypeId ?? SeedProductType().Id;
        var product = new Product
        {
            Name = name,
            Description = $"{name} opis",
            Price = price,
            StockQuantity = stock,
            ImageUrl = imageUrl,
            ProductTypeId = typeId,
        };
        Db.Products.Add(product);
        Db.SaveChanges();
        return product;
    }

    public User SeedUser(
        string email = "buyer@example.com",
        string firstName = "Mila",
        string lastName = "Jović",
        string? defaultAddress = "Knez Mihailova 1, Beograd")
    {
        var user = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Role = UserRole.User,
            Country = "Srbija",
            DefaultAddress = defaultAddress,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("SecurePass1"),
        };
        Db.Users.Add(user);
        Db.SaveChanges();
        return user;
    }

    public void AuthenticateAs(User user)
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())],
            authenticationType: "Test");
        Controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
        CouponsController.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
    }

    public void AddToCart(User user, Product product, int quantity = 1)
    {
        Db.Carts.Add(new Cart
        {
            UserId = user.Id,
            ProductId = product.Id,
            Quantity = quantity,
        });
        Db.SaveChanges();
    }

    public Coupon SeedCoupon(
        string code = "POPUST10",
        decimal discountValue = 10m,
        bool isPercentage = true,
        CouponUsageLimit usageLimit = CouponUsageLimit.Unlimited,
        DateTime? expiresAt = null)
    {
        var coupon = new Coupon
        {
            Code = code.Trim().ToUpperInvariant(),
            DiscountValue = discountValue,
            IsPercentage = isPercentage,
            UsageLimit = usageLimit,
            IsActive = true,
            ExpiresAt = expiresAt,
        };
        Db.Coupons.Add(coupon);
        Db.SaveChanges();
        return coupon;
    }

    public void Dispose() => Db.Dispose();
}
