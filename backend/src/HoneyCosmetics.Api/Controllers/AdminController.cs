using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    // ── Dashboard ────────────────────────────────────────────────────────────
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var totalOrders = await db.Orders.CountAsync();
        var pendingOrders = await db.Orders.CountAsync(x => x.Status == OrderStatus.Pending);
        var totalProducts = await db.Products.CountAsync();
        var totalRevenue = await db.Orders
            .Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Returned)
            .SumAsync(x => (decimal?)x.Total) ?? 0;

        return Ok(new { totalOrders, pendingOrders, totalProducts, totalRevenue });
    }

    // ── Orders ───────────────────────────────────────────────────────────────
    [HttpGet("orders")]
    public async Task<ActionResult<IReadOnlyCollection<AdminOrderResponse>>> GetOrders(
        [FromQuery] string? status,
        [FromQuery] string? search)
    {
        var query = db.Orders
            .Include(x => x.Items).ThenInclude(x => x.Product)
            .Include(x => x.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
            query = query.Where(x => x.Status == parsedStatus);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x =>
                x.User!.Email.ToLower().Contains(term) ||
                (x.User.FirstName + " " + x.User.LastName).ToLower().Contains(term));
        }

        var orders = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(orders.Select(MapAdminOrder));
    }

    [HttpPut("orders/{orderId:int}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await db.Orders.FindAsync(orderId);
        if (order is null) return NotFound();

        order.Status = request.Status;
        await db.SaveChangesAsync();
        return Ok(new { order.Id, status = order.Status.ToString() });
    }

    // ── Products ─────────────────────────────────────────────────────────────
    [HttpGet("products")]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetProducts()
    {
        var products = await db.Products
            .Include(x => x.Category)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        return Ok(products.Select(MapProduct));
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductResponse>> CreateProduct([FromBody] ProductRequest request)
    {
        var product = new Product
        {
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            ImageUrl = request.ImageUrl,
            CategoryId = request.CategoryId,
            ProductType = request.ProductType
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        await db.Entry(product).Reference(p => p.Category).LoadAsync();
        return Ok(MapProduct(product));
    }

    [HttpPut("products/{id:int}")]
    public async Task<ActionResult<ProductResponse>> UpdateProduct(int id, [FromBody] ProductRequest request)
    {
        var product = await db.Products.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id);
        if (product is null) return NotFound();

        product.Name = request.Name;
        product.Description = request.Description;
        product.Price = request.Price;
        product.ImageUrl = request.ImageUrl;
        product.CategoryId = request.CategoryId;
        product.ProductType = request.ProductType;
        await db.SaveChangesAsync();
        await db.Entry(product).Reference(p => p.Category).LoadAsync();
        return Ok(MapProduct(product));
    }

    [HttpDelete("products/{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Categories ────────────────────────────────────────────────────────────
    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyCollection<CategoryResponse>>> GetCategories()
    {
        var cats = await db.Categories.OrderBy(x => x.Id).ToListAsync();
        return Ok(cats.Select(c => new CategoryResponse(c.Id, c.Name)));
    }

    // ── Image upload ─────────────────────────────────────────────────────────
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest("No file.");
        if (file.Length > 5 * 1024 * 1024) return BadRequest("File too large (max 5 MB).");

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext)) return BadRequest("Unsupported file type.");

        var imagesDir = Path.Combine(env.ContentRootPath, "images");
        Directory.CreateDirectory(imagesDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(imagesDir, fileName);
        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        var url = $"/images/{fileName}";
        return Ok(new { url });
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    private static ProductResponse MapProduct(Product p) =>
        new(p.Id, p.Name, p.Description, p.Price, p.ImageUrl, p.CategoryId, p.Category?.Name ?? string.Empty, p.ProductType, p.CreatedAt);

    private static AdminOrderResponse MapAdminOrder(Order o) => new(
        o.Id,
        o.User is not null ? $"{o.User.FirstName} {o.User.LastName}".Trim() : (o.GuestName ?? "Gost"),
        o.User?.Email ?? (o.GuestEmail ?? "—"),
        o.DeliveryAddress,
        o.Phone,
        o.PaymentMethod.ToString(),
        o.Status.ToString(),
        o.Subtotal,
        o.Discount,
        o.Total,
        o.CreatedAt,
        o.Items.Select(i => new OrderItemResponse(i.ProductId, i.Product?.Name ?? "—", i.Product?.ImageUrl, i.Quantity, i.UnitPrice)).ToList());
}

public record UpdateOrderStatusRequest(OrderStatus Status);

public record AdminOrderResponse(
    int Id,
    string CustomerName,
    string CustomerEmail,
    string DeliveryAddress,
    string? Phone,
    string PaymentMethod,
    string Status,
    decimal Subtotal,
    decimal Discount,
    decimal Total,
    DateTime CreatedAt,
    IReadOnlyCollection<OrderItemResponse> Items);

