using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Infrastructure.Services;
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
                ImageUrl = x.Product.ImageUrl,
                StockQuantity = x.Product.StockQuantity,
                InStock = x.Product.StockQuantity > 0
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Add(CartItemRequest request)
    {
        var userId = User.GetUserId();
        var product = await db.Products.ActiveProducts()
            .FirstOrDefaultAsync(p => p.Id == request.ProductId);
        if (product is null)
            return NotFound("Product not found.");

        if (product.StockQuantity <= 0)
            return BadRequest("Proizvod trenutno nije na stanju.");

        var existing = await db.Carts
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == request.ProductId);
        var currentQty = existing?.Quantity ?? 0;
        var addQty = Math.Max(1, request.Quantity);
        var allowedAdd = Math.Min(addQty, product.StockQuantity - currentQty);
        if (allowedAdd <= 0)
            return BadRequest("Nema dovoljno proizvoda na stanju.");

        // Upsert: handles concurrent requests without duplicate key errors
        await db.Database.ExecuteSqlRawAsync(
            @"INSERT INTO ""Carts"" (""UserId"", ""ProductId"", ""Quantity"")
              VALUES ({0}, {1}, {2})
              ON CONFLICT (""UserId"", ""ProductId"") DO UPDATE
              SET ""Quantity"" = ""Carts"".""Quantity"" + EXCLUDED.""Quantity""",
            userId, request.ProductId, allowedAdd);

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
