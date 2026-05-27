using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/site-popup")]
public class SitePopupController(AppDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("active")]
    public async Task<ActionResult<ActiveSitePopupResponse>> GetActive()
    {
        var popup = await db.SitePopups
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ActiveSitePopupResponse(
                p.Id,
                p.ImageUrl,
                p.MobileImageUrl,
                p.Type.ToString(),
                p.ProductId,
                p.CouponCode))
            .FirstOrDefaultAsync();

        if (popup is null)
            return NoContent();

        return Ok(popup);
    }
}
