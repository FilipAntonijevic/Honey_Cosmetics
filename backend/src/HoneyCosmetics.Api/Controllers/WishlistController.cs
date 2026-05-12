using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/wishlist")]
public class WishlistController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<object>>> Get()
    {
        var userId = User.GetUserId();
        var items = await db.Wishlists
            .Where(x => x.UserId == userId)
            .Include(x => x.Product)
            .Select(x => new { x.ProductId, x.Product!.Name, x.Product.Price, x.Product.ImageUrl })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("{productId:int}")]
    public async Task<IActionResult> Add(int productId)
    {
        var userId = User.GetUserId();
        var exists = await db.Wishlists.AnyAsync(x => x.UserId == userId && x.ProductId == productId);
        if (!exists)
        {
            db.Wishlists.Add(new HoneyCosmetics.Domain.Entities.Wishlist { UserId = userId, ProductId = productId });
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpDelete("{productId:int}")]
    public async Task<IActionResult> Remove(int productId)
    {
        var userId = User.GetUserId();
        var item = await db.Wishlists.FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId);
        if (item is null)
        {
            return NotFound();
        }

        db.Wishlists.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
