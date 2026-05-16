using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("~/api/product-types")]
    public async Task<ActionResult<IReadOnlyCollection<ProductTypeResponse>>> GetProductTypesPublic()
    {
        var list = await db.ProductTypes.OrderBy(x => x.Id).Select(x => new ProductTypeResponse(x.Id, x.Name)).ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("~/api/site/links")]
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

    [AllowAnonymous]
    [HttpGet("bestsellers")]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetBestsellers()
    {
        var list = await db.Products
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Where(x => x.IsBestseller)
            .OrderBy(x => x.BestsellerSortOrder)
            .Select(x => new ProductResponse(
                x.Id,
                x.Name,
                x.Description,
                x.Price,
                x.ImageUrl,
                x.ProductTypeId,
                x.ProductType != null ? x.ProductType.Name : string.Empty,
                x.CategoryId,
                x.Category != null ? x.Category.Name : string.Empty,
                x.IsBestseller,
                x.BestsellerSortOrder,
                x.CreatedAt))
            .ToListAsync();
        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("~/api/categories")]
    public async Task<ActionResult<IReadOnlyCollection<PublicCategoryResponse>>> GetCategoriesPublic([FromQuery] int? productTypeId)
    {
        var query = db.Categories.AsQueryable();
        if (productTypeId.HasValue)
            query = query.Where(c => c.ProductTypeId == productTypeId.Value);

        var list = await query
            .OrderBy(c => c.Id)
            .Select(c => new PublicCategoryResponse(
                c.Id,
                c.Name,
                c.ImageUrl,
                c.ProductTypeId,
                c.Products.Count))
            .ToListAsync();

        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetAll([FromQuery] ProductQuery query)
    {
        var products = db.Products.Include(x => x.Category).Include(x => x.ProductType).AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            products = products.Where(x => x.Name.ToLower().Contains(term));
        }

        if (query.CategoryId.HasValue)
        {
            products = products.Where(x => x.CategoryId == query.CategoryId.Value);
        }

        products = query.Sort?.ToLowerInvariant() switch
        {
            "a-z" => products.OrderBy(x => x.Name),
            "z-a" => products.OrderByDescending(x => x.Name),
            "price-asc" => products.OrderBy(x => x.Price),
            "price-desc" => products.OrderByDescending(x => x.Price),
            _ => products.OrderByDescending(x => x.CreatedAt)
        };

        var result = await products
            .Select(x => new ProductResponse(
                x.Id,
                x.Name,
                x.Description,
                x.Price,
                x.ImageUrl,
                x.ProductTypeId,
                x.ProductType != null ? x.ProductType.Name : string.Empty,
                x.CategoryId,
                x.Category != null ? x.Category.Name : string.Empty,
                x.IsBestseller,
                x.BestsellerSortOrder,
                x.CreatedAt))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductResponse>> GetById(int id)
    {
        var product = await db.Products.Include(x => x.Category).Include(x => x.ProductType).FirstOrDefaultAsync(x => x.Id == id);
        return product is null
            ? NotFound()
            : Ok(new ProductResponse(
                product.Id,
                product.Name,
                product.Description,
                product.Price,
                product.ImageUrl,
                product.ProductTypeId,
                product.ProductType != null ? product.ProductType.Name : string.Empty,
                product.CategoryId,
                product.Category != null ? product.Category.Name : string.Empty,
                product.IsBestseller,
                product.BestsellerSortOrder,
                product.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<ProductResponse>> Create(ProductRequest request)
    {
        if (!await CategoryMatchesProductTypeAsync(request.ProductTypeId, request.CategoryId))
            return BadRequest("Kategorija mora pripadati izabranoj vrsti proizvoda.");

        var product = new HoneyCosmetics.Domain.Entities.Product
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
        await db.Entry(product).Reference(x => x.ProductType).LoadAsync();
        await db.Entry(product).Reference(x => x.Category).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, new ProductResponse(
            product.Id,
            product.Name,
            product.Description,
            product.Price,
            product.ImageUrl,
            product.ProductTypeId,
            product.ProductType != null ? product.ProductType.Name : string.Empty,
            product.CategoryId,
            product.Category != null ? product.Category.Name : string.Empty,
            product.IsBestseller,
            product.BestsellerSortOrder,
            product.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ProductRequest request)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            return NotFound();
        }

        if (!await CategoryMatchesProductTypeAsync(request.ProductTypeId, request.CategoryId))
            return BadRequest("Kategorija mora pripadati izabranoj vrsti proizvoda.");

        product.Name = request.Name;
        product.Description = request.Description;
        product.Price = request.Price;
        product.ImageUrl = request.ImageUrl;
        product.ProductTypeId = request.ProductTypeId;
        product.CategoryId = request.CategoryId;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null)
        {
            return NotFound();
        }

        if (await db.OrderItems.AnyAsync(x => x.ProductId == id))
        {
            return BadRequest(
                "Proizvod je deo postojećih porudžbina i ne može se obrisati. Istorija porudžbina mora ostati netaknuta.");
        }

        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Task<bool> CategoryMatchesProductTypeAsync(int productTypeId, int? categoryId)
    {
        if (categoryId is null) return Task.FromResult(true);
        return db.Categories.AnyAsync(c => c.Id == categoryId.Value && c.ProductTypeId == productTypeId);
    }
}
