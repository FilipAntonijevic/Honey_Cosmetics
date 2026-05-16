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
            .Include(x => x.ProductType)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        return Ok(products.Select(MapProduct));
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductResponse>> CreateProduct([FromBody] ProductRequest request)
    {
        if (!await CategoryMatchesProductTypeAsync(request.ProductTypeId, request.CategoryId))
            return BadRequest("Kategorija mora pripadati izabranoj vrsti proizvoda.");

        var product = new Product
        {
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            ImageUrl = request.ImageUrl,
            ProductTypeId = request.ProductTypeId,
            CategoryId = request.CategoryId
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        await db.Entry(product).Reference(p => p.Category).LoadAsync();
        await db.Entry(product).Reference(p => p.ProductType).LoadAsync();
        return Ok(MapProduct(product));
    }

    [HttpPut("products/{id:int}")]
    public async Task<ActionResult<ProductResponse>> UpdateProduct(int id, [FromBody] ProductRequest request)
    {
        var product = await db.Products.Include(x => x.Category).Include(x => x.ProductType).FirstOrDefaultAsync(x => x.Id == id);
        if (product is null) return NotFound();

        if (!await CategoryMatchesProductTypeAsync(request.ProductTypeId, request.CategoryId))
            return BadRequest("Kategorija mora pripadati izabranoj vrsti proizvoda.");

        product.Name = request.Name;
        product.Description = request.Description;
        product.Price = request.Price;
        product.ImageUrl = request.ImageUrl;
        product.ProductTypeId = request.ProductTypeId;
        product.CategoryId = request.CategoryId;

        await db.SaveChangesAsync();
        await db.Entry(product).Reference(p => p.Category).LoadAsync();
        await db.Entry(product).Reference(p => p.ProductType).LoadAsync();
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

    // ── Product types (vrste) ─────────────────────────────────────────────────
    // Vrste su statične — definisane seed-om u Program.cs. Nema endpoint-a za kreiranje/brisanje.
    [HttpGet("product-types")]
    public async Task<ActionResult<IReadOnlyCollection<ProductTypeResponse>>> GetProductTypes()
    {
        var list = await db.ProductTypes.OrderBy(x => x.Id).Select(x => new ProductTypeResponse(x.Id, x.Name)).ToListAsync();
        return Ok(list);
    }

    // ── Categories (unutar vrste) ─────────────────────────────────────────────
    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyCollection<AdminCategoryResponse>>> GetCategories([FromQuery] int? productTypeId)
    {
        var query = db.Categories.Include(c => c.ProductType).AsQueryable();
        if (productTypeId.HasValue)
            query = query.Where(c => c.ProductTypeId == productTypeId.Value);

        var cats = await query.OrderBy(x => x.Name).ToListAsync();
        return Ok(cats.Select(c => new AdminCategoryResponse(
            c.Id,
            c.Name,
            c.ImageUrl,
            c.ProductTypeId,
            c.ProductType != null ? c.ProductType.Name : string.Empty)));
    }

    [HttpPost("categories")]
    public async Task<ActionResult<AdminCategoryResponse>> CreateCategory([FromBody] CategoryUpsertRequest request)
    {
        if (!await db.ProductTypes.AnyAsync(x => x.Id == request.ProductTypeId))
            return BadRequest("Nepoznata vrsta proizvoda.");

        var name = request.Name.Trim();
        if (string.IsNullOrEmpty(name)) return BadRequest("Naziv je obavezan.");

        var entity = new Category
        {
            Name = name,
            ImageUrl = request.ImageUrl.Trim(),
            ProductTypeId = request.ProductTypeId
        };
        db.Categories.Add(entity);
        await db.SaveChangesAsync();
        await db.Entry(entity).Reference(x => x.ProductType).LoadAsync();
        return Ok(new AdminCategoryResponse(
            entity.Id,
            entity.Name,
            entity.ImageUrl,
            entity.ProductTypeId,
            entity.ProductType?.Name ?? string.Empty));
    }

    [HttpPut("categories/{id:int}")]
    public async Task<ActionResult<AdminCategoryResponse>> UpdateCategory(int id, [FromBody] CategoryUpsertRequest request)
    {
        var entity = await db.Categories.Include(x => x.ProductType).FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) return NotFound();

        if (entity.ProductTypeId != request.ProductTypeId)
            return BadRequest("Promena vrste nije dozvoljena.");

        entity.Name = request.Name.Trim();
        entity.ImageUrl = request.ImageUrl.Trim();
        await db.SaveChangesAsync();
        await db.Entry(entity).Reference(x => x.ProductType).LoadAsync();
        return Ok(new AdminCategoryResponse(
            entity.Id,
            entity.Name,
            entity.ImageUrl,
            entity.ProductTypeId,
            entity.ProductType?.Name ?? string.Empty));
    }

    [HttpDelete("categories/{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var entity = await db.Categories.FindAsync(id);
        if (entity is null) return NotFound();
        db.Categories.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Bestsellers ───────────────────────────────────────────────────────────
    [HttpGet("bestsellers")]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetBestsellers()
    {
        var list = await db.Products
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Where(x => x.IsBestseller)
            .OrderBy(x => x.BestsellerSortOrder)
            .ToListAsync();
        return Ok(list.Select(MapProduct));
    }

    [HttpPut("bestsellers")]
    public async Task<IActionResult> UpdateBestsellers([FromBody] BestsellersUpdateRequest request)
    {
        var ids = request.ProductIds?.Distinct().ToList() ?? new List<int>();

        if (ids.Count > 0)
        {
            var existing = await db.Products.Where(p => ids.Contains(p.Id)).Select(p => p.Id).ToListAsync();
            var missing = ids.Except(existing).ToList();
            if (missing.Count > 0)
                return BadRequest($"Proizvodi sa Id-jevima [{string.Join(", ", missing)}] ne postoje.");
        }

        // Reset flags on previously flagged products not in the new list
        var current = await db.Products.Where(p => p.IsBestseller).ToListAsync();
        foreach (var p in current)
        {
            if (!ids.Contains(p.Id))
            {
                p.IsBestseller = false;
                p.BestsellerSortOrder = 0;
            }
        }

        // Apply new list with order
        for (int i = 0; i < ids.Count; i++)
        {
            var prod = await db.Products.FirstAsync(p => p.Id == ids[i]);
            prod.IsBestseller = true;
            prod.BestsellerSortOrder = i;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Site links (footer social/contact links) ─────────────────────────────
    [HttpGet("site/links")]
    public async Task<ActionResult<SiteLinksResponse>> GetSiteLinks()
    {
        var s = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        return Ok(new SiteLinksResponse(
            s?.InstagramUrl ?? string.Empty,
            s?.TikTokUrl ?? string.Empty,
            s?.EmailAddress ?? string.Empty,
            s?.PhoneNumber ?? string.Empty,
            s?.ComplaintsEmail ?? string.Empty,
            s?.WhatsAppNumber ?? string.Empty,
            s?.ViberNumber ?? string.Empty,
            s?.NotificationsEmail ?? string.Empty));
    }

    [HttpPut("site/links")]
    public async Task<ActionResult<SiteLinksResponse>> UpdateSiteLinks([FromBody] SiteLinksUpdateRequest request)
    {
        var s = await db.SiteSettings.FirstOrDefaultAsync();
        if (s is null)
        {
            s = new SiteSettings { Id = 1 };
            db.SiteSettings.Add(s);
        }

        s.InstagramUrl = (request.InstagramUrl ?? string.Empty).Trim();
        s.TikTokUrl = (request.TikTokUrl ?? string.Empty).Trim();
        s.EmailAddress = (request.EmailAddress ?? string.Empty).Trim();
        s.PhoneNumber = (request.PhoneNumber ?? string.Empty).Trim();
        s.ComplaintsEmail = (request.ComplaintsEmail ?? string.Empty).Trim();
        s.WhatsAppNumber = (request.WhatsAppNumber ?? string.Empty).Trim();
        s.ViberNumber = (request.ViberNumber ?? string.Empty).Trim();
        s.NotificationsEmail = (request.NotificationsEmail ?? string.Empty).Trim();

        await db.SaveChangesAsync();
        return Ok(new SiteLinksResponse(
            s.InstagramUrl,
            s.TikTokUrl,
            s.EmailAddress,
            s.PhoneNumber,
            s.ComplaintsEmail,
            s.WhatsAppNumber,
            s.ViberNumber,
            s.NotificationsEmail));
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

    private Task<bool> CategoryMatchesProductTypeAsync(int productTypeId, int? categoryId)
    {
        if (categoryId is null) return Task.FromResult(true);
        return db.Categories.AnyAsync(c => c.Id == categoryId.Value && c.ProductTypeId == productTypeId);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    private static ProductResponse MapProduct(Product p) =>
        new(
            p.Id,
            p.Name,
            p.Description,
            p.Price,
            p.ImageUrl,
            p.ProductTypeId,
            p.ProductType != null ? p.ProductType.Name : string.Empty,
            p.CategoryId,
            p.Category != null ? p.Category.Name : string.Empty,
            p.IsBestseller,
            p.BestsellerSortOrder,
            p.CreatedAt);

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
        o.CouponCode,
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
    string? CouponCode,
    decimal Total,
    DateTime CreatedAt,
    IReadOnlyCollection<OrderItemResponse> Items);

