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

        // Remove stale rows (soft-deleted or missing products) so counts stay accurate.
        await db.Wishlists
            .Where(w => w.UserId == userId)
            .Where(w => !db.Products.Any(p => p.Id == w.ProductId && !p.IsDeleted))
            .ExecuteDeleteAsync();

        var items = await db.Wishlists
            .Where(x => x.UserId == userId && x.Product != null && !x.Product.IsDeleted)
            .Include(x => x.Product)
            .Select(x => new
            {
                x.ProductId,
                x.Product!.Name,
                x.Product.Price,
                x.Product.ImageUrl,
                x.Product.StockQuantity,
                InStock = x.Product.StockQuantity > 0,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("{productId:int}")]
    public async Task<IActionResult> Add(int productId)
    {
        var userId = User.GetUserId();
        var productActive = await db.Products.AnyAsync(p => p.Id == productId && !p.IsDeleted);
        if (!productActive)
            return NotFound("Proizvod nije dostupan.");

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
