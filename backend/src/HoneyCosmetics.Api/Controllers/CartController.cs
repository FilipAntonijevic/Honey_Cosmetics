using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/cart")]
public class CartController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<object>>> Get()
    {
        var userId = User.GetUserId();
        var items = await db.Carts
            .Where(x => x.UserId == userId)
            .Include(x => x.Product)
            .Select(x => new
            {
                x.ProductId,
                x.Quantity,
                Name = x.Product!.Name,
                Price = x.Product.Price,
                ImageUrl = x.Product.ImageUrl
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Add(CartItemRequest request)
    {
        var userId = User.GetUserId();
        var productExists = await db.Products.AnyAsync(p => p.Id == request.ProductId);
        if (!productExists)
        {
            return NotFound("Product not found.");
        }

        var qty = Math.Max(1, request.Quantity);

        // Upsert: handles concurrent requests without duplicate key errors
        await db.Database.ExecuteSqlRawAsync(
            @"INSERT INTO ""Carts"" (""UserId"", ""ProductId"", ""Quantity"")
              VALUES ({0}, {1}, {2})
              ON CONFLICT (""UserId"", ""ProductId"") DO UPDATE
              SET ""Quantity"" = ""Carts"".""Quantity"" + EXCLUDED.""Quantity""",
            userId, request.ProductId, qty);

        return NoContent();
    }

    [HttpDelete("{productId:int}")]
    public async Task<IActionResult> Remove(int productId)
    {
        var userId = User.GetUserId();
        var item = await db.Carts.FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId);
        if (item is null)
        {
            return NotFound();
        }

        db.Carts.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
