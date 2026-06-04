using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/coupons")]
public class CouponsController(AppDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("validate")]
    public async Task<ActionResult<CouponValidationResponse>> Validate([FromBody] string code)
    {
        await CouponApplicationService.DeactivateExpiredCouponsAsync(db);

        var coupon = await CouponApplicationService.FindActiveCouponAsync(db, code);
        if (coupon is null || CouponApplicationService.IsExpired(coupon))
        {
            return Ok(new CouponValidationResponse(false, "Izabrali ste nepostojeci kupon.", 0, false));
        }

        Guid? userId = User.Identity?.IsAuthenticated == true ? User.GetUserId() : null;
        var error = await CouponApplicationService.GetEligibilityErrorAsync(db, coupon, userId);
        if (error is not null)
        {
            return Ok(new CouponValidationResponse(false, error, 0, false));
        }

        return Ok(new CouponValidationResponse(true, "Kupon je validan.", coupon.DiscountValue, coupon.IsPercentage));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> List()
    {
        await CouponApplicationService.DeactivateExpiredCouponsAsync(db);

        var coupons = await db.Coupons
            .Include(x => x.Usages)
            .OrderByDescending(x => x.Id)
            .Select(x => new
            {
                x.Id,
                x.Code,
                x.DiscountValue,
                x.IsPercentage,
                x.ExpiresAt,
                UsageLimit = x.UsageLimit.ToString(),
                x.IsActive,
                UsageCount = x.Usages.Count
            })
            .ToListAsync();
        return Ok(coupons);
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var coupon = await db.Coupons.FindAsync(id);
        if (coupon is null) return NotFound();
        coupon.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var coupon = await db.Coupons.FindAsync(id);
        if (coupon is null) return NotFound();
        db.Coupons.Remove(coupon);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CouponRequest request)
    {
        if (request.IsPercentage && (request.DiscountValue < 0 || request.DiscountValue > 100))
            return BadRequest("Procenat popusta mora biti između 0 i 100.");

        var exists = await db.Coupons.AnyAsync(x => x.Code.ToUpper() == request.Code.Trim().ToUpper());
        if (exists)
        {
            return BadRequest("Coupon code already exists.");
        }

        db.Coupons.Add(new Coupon
        {
            Code = request.Code.Trim().ToUpper(),
            DiscountValue = request.DiscountValue,
            IsPercentage = request.IsPercentage,
            ExpiresAt = request.ExpiresAt,
            UsageLimit = request.UsageLimit,
            IsActive = true
        });

        await db.SaveChangesAsync();
        return NoContent();
    }
}
