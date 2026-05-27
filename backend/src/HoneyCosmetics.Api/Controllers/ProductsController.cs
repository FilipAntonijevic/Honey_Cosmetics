using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Application.Mapping;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Infrastructure.Services;
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
            s?.NotificationsEmail ?? string.Empty,
            s?.FreeShippingThreshold ?? 10000m,
            s?.NotificationBannerText ?? string.Empty,
            s?.NotificationBannerEnabled ?? true,
            s?.BankTransferRecipientName ?? string.Empty,
            s?.BankTransferRecipientAddress ?? string.Empty,
            s?.BankTransferAccountNumber ?? string.Empty,
            s?.BankTransferBankName ?? string.Empty,
            s?.BankTransferPurpose ?? string.Empty));
    }

    [AllowAnonymous]
    [HttpGet("bestsellers")]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetBestsellers()
    {
        var list = await db.Products
            .ActiveProducts()
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Include(x => x.AdditionalImages)
            .Where(x => x.IsBestseller)
            .OrderBy(x => x.BestsellerSortOrder)
            .ToListAsync();
        return Ok(list.Select(p => ProductMapper.ToResponse(p)));
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
                c.Products.Count(p => !p.IsDeleted)))
            .ToListAsync();

        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetAll([FromQuery] ProductQuery query)
    {
        var products = db.Products.ActiveProducts().Include(x => x.Category).Include(x => x.ProductType).AsQueryable();

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
            .Include(x => x.AdditionalImages)
            .ToListAsync();

        return Ok(result.Select(p => ProductMapper.ToResponse(p)));
    }

    [AllowAnonymous]
    [HttpGet("{id:int}/related")]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetRelated(int id, [FromQuery] int count = 4)
    {
        count = Math.Clamp(count, 1, 12);

        var pool = await db.Products
            .ActiveProducts()
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Include(x => x.AdditionalImages)
            .Where(x => x.Id != id)
            .ToListAsync();

        var list = pool
            .OrderBy(_ => Random.Shared.Next())
            .Take(count)
            .Select(p => ProductMapper.ToResponse(p))
            .ToList();

        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductResponse>> GetById(int id)
    {
        var product = await db.Products
            .ActiveProducts()
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Include(x => x.AdditionalImages)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (product is null)
            return NotFound();

        return Ok(ProductMapper.ToResponse(product));
    }
}
