using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/coupons")]
public class CouponsController(AppDbContext db) : ControllerBase
{
    [HttpPost("validate")]
    public async Task<ActionResult<CouponValidationResponse>> Validate([FromBody] string code)
    {
        var userId = User.GetUserId();
        var coupon = await db.Coupons.FirstOrDefaultAsync(x => x.Code.ToUpper() == code.Trim().ToUpper() && x.IsActive);
        if (coupon is null || (coupon.ExpiresAt.HasValue && coupon.ExpiresAt <= DateTime.UtcNow))
        {
            return Ok(new CouponValidationResponse(false, "Coupon ne postoji ili je istekao.", 0));
        }

        var alreadyUsed = await db.CouponUsages.AnyAsync(x => x.CouponId == coupon.Id && x.UserId == userId);
        if (alreadyUsed)
        {
            return Ok(new CouponValidationResponse(false, "Coupon je već iskorišćen.", 0));
        }

        return Ok(new CouponValidationResponse(true, "Coupon je validan.", coupon.DiscountValue));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(CouponRequest request)
    {
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
            FirstOrderOnly = request.FirstOrderOnly,
            IsActive = true
        });

        await db.SaveChangesAsync();
        return NoContent();
    }
}
