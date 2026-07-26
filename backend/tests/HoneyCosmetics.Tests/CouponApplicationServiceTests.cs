using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Services;
using HoneyCosmetics.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Tests;

public class CouponApplicationServiceTests
{
    [Theory]
    [InlineData(1000, 10, true, 100)]
    [InlineData(1999, 15, true, 299.85)]
    [InlineData(5000, 500, false, 500)]
    [InlineData(200, 500, false, 500)]
    public void CalculateDiscount_applies_percent_and_fixed_values(
        decimal subtotal,
        decimal discountValue,
        bool isPercentage,
        decimal expected)
    {
        var coupon = new Coupon
        {
            DiscountValue = discountValue,
            IsPercentage = isPercentage,
        };

        var discount = CouponApplicationService.CalculateDiscount(coupon, subtotal);
        Assert.Equal(expected, discount);
    }

    [Fact]
    public async Task FindActiveCoupon_is_case_insensitive_and_ignores_inactive()
    {
        using var fx = new OrdersTestFixture();
        fx.SeedCoupon(code: "SUMMER20", discountValue: 20m);

        var found = await CouponApplicationService.FindActiveCouponAsync(fx.Db, " summer20 ");
        Assert.NotNull(found);
        Assert.Equal("SUMMER20", found!.Code);

        found!.IsActive = false;
        await fx.Db.SaveChangesAsync();

        Assert.Null(await CouponApplicationService.FindActiveCouponAsync(fx.Db, "SUMMER20"));
    }

    [Fact]
    public async Task GetEligibilityError_blocks_once_per_user_reuse()
    {
        using var fx = new OrdersTestFixture();
        var user = fx.SeedUser();
        var coupon = fx.SeedCoupon(usageLimit: CouponUsageLimit.OncePerUser);

        Assert.Null(await CouponApplicationService.GetEligibilityErrorAsync(fx.Db, coupon, user.Id));

        fx.Db.CouponUsages.Add(new CouponUsage { CouponId = coupon.Id, UserId = user.Id });
        await fx.Db.SaveChangesAsync();

        var error = await CouponApplicationService.GetEligibilityErrorAsync(fx.Db, coupon, user.Id);
        Assert.Equal("Kupon je već iskorišćen.", error);
    }

    [Fact]
    public async Task GetEligibilityError_requires_login_for_once_per_user()
    {
        using var fx = new OrdersTestFixture();
        var coupon = fx.SeedCoupon(usageLimit: CouponUsageLimit.OncePerUser);

        var error = await CouponApplicationService.GetEligibilityErrorAsync(fx.Db, coupon, userId: null);
        Assert.Equal("Molimo vas da se ulogujete da biste koristili kupon.", error);
    }

    [Fact]
    public async Task DeactivateExpiredCoupons_marks_expired_inactive()
    {
        using var fx = new OrdersTestFixture();
        var coupon = fx.SeedCoupon(expiresAt: DateTime.UtcNow.AddMinutes(-1));

        await CouponApplicationService.DeactivateExpiredCouponsAsync(fx.Db);

        var refreshed = await fx.Db.Coupons.SingleAsync(c => c.Id == coupon.Id);
        Assert.False(refreshed.IsActive);
    }

    [Fact]
    public async Task Validate_endpoint_returns_valid_coupon_details()
    {
        using var fx = new OrdersTestFixture();
        fx.SeedCoupon(code: "VALID15", discountValue: 15m, isPercentage: true);

        var result = await fx.CouponsController.Validate("valid15");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<CouponValidationResponse>(ok.Value);
        Assert.True(response.IsValid);
        Assert.Equal(15m, response.DiscountValue);
        Assert.True(response.IsPercentage);
        Assert.Equal("Kupon je validan.", response.Message);
    }

    [Fact]
    public async Task Validate_endpoint_rejects_unknown_coupon()
    {
        using var fx = new OrdersTestFixture();

        var result = await fx.CouponsController.Validate("XYZ");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<CouponValidationResponse>(ok.Value);
        Assert.False(response.IsValid);
        Assert.Equal("Izabrali ste nepostojeci kupon.", response.Message);
    }

    [Fact]
    public async Task RecordCouponUsage_deactivates_once_total_coupon()
    {
        using var fx = new OrdersTestFixture();
        var coupon = fx.SeedCoupon(usageLimit: CouponUsageLimit.OnceTotal);

        CouponApplicationService.RecordCouponUsage(fx.Db, coupon, userId: null);
        await fx.Db.SaveChangesAsync();

        Assert.False(coupon.IsActive);
        Assert.True(await fx.Db.CouponUsages.AnyAsync(u => u.CouponId == coupon.Id && u.UserId == null));
    }
}
