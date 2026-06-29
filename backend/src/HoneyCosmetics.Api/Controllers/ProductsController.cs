using HoneyCosmetics.Application;
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
            s?.ShippingCost ?? 430m,
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
        return Ok(await MapManyWithVariantsAsync(list));
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
                c.Products
                    .Where(p => !p.IsDeleted)
                    .Select(p => p.VariantGroupId ?? p.Id)
                    .Distinct()
                    .Count()))
            .ToListAsync();

        return Ok(list);
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ProductQuery query)
    {
        var products = BuildProductQuery(query);

        if (query.Page is > 0)
        {
            var page = query.Page.Value;
            var pageSize = Math.Clamp(query.PageSize, 1, 48);
            return Ok(await GetPagedAsync(products, query, page, pageSize));
        }

        var result = await products
            .Include(x => x.AdditionalImages)
            .ToListAsync();

        result = ApplySearch(result, query.Search);
        result = ApplySort(result, query.Sort);
        return Ok(await MapManyWithVariantsAsync(result));
    }

    private static List<Domain.Entities.Product> ApplySearch(
        List<Domain.Entities.Product> products,
        string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
            return products;

        return ProductSearch
            .FilterByName(products, search, p => p.Name)
            .ToList();
    }

    private IQueryable<Domain.Entities.Product> BuildProductQuery(ProductQuery query)
    {
        var products = db.Products.ActiveProducts().Include(x => x.Category).Include(x => x.ProductType).AsQueryable();

        if (query.CategoryId.HasValue)
            products = products.Where(x => x.CategoryId == query.CategoryId.Value);
        else if (query.ProductTypeId.HasValue)
            products = products.Where(x => x.ProductTypeId == query.ProductTypeId.Value);

        return query.Sort?.ToLowerInvariant() switch
        {
            "price-asc" => products.OrderBy(x => x.Price),
            "price-desc" => products.OrderByDescending(x => x.Price),
            _ => products,
        };
    }

    private static List<Domain.Entities.Product> ApplySort(
        List<Domain.Entities.Product> products,
        string? sort)
    {
        return sort?.ToLowerInvariant() switch
        {
            "z-a" => products.OrderByDescending(x => x.Name, ProductNaturalNameComparer.Instance).ToList(),
            "price-asc" or "price-desc" => products,
            _ => products.OrderBy(x => x.Name, ProductNaturalNameComparer.Instance).ToList(),
        };
    }

    private static List<Domain.Entities.Product> PickDisplayRepresentatives(
        IReadOnlyList<Domain.Entities.Product> products)
    {
        return products
            .GroupBy(ProductVariantService.ResolveGroupId)
            .Select(g => ProductVariantService.PickDefaultVariant(g.ToList()))
            .ToList();
    }

    private async Task<PagedProductResponse> GetPagedAsync(
        IQueryable<Domain.Entities.Product> products,
        ProductQuery query,
        int page,
        int pageSize)
    {
        var allProducts = ApplySearch(await products.ToListAsync(), query.Search);
        var representatives = ApplySort(PickDisplayRepresentatives(allProducts), query.Sort);

        var totalCount = representatives.Count;
        var pageReps = representatives
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        if (pageReps.Count == 0)
        {
            return new PagedProductResponse([], totalCount, page, pageSize, false);
        }

        var pageRepIds = pageReps.Select(p => p.Id).ToHashSet();
        var fullPageProducts = await db.Products
            .ActiveProducts()
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Include(x => x.AdditionalImages)
            .Where(p => pageRepIds.Contains(p.Id))
            .ToListAsync();

        var orderById = pageReps.Select((p, i) => (p.Id, i)).ToDictionary(x => x.Id, x => x.i);
        fullPageProducts.Sort((a, b) => orderById[a.Id].CompareTo(orderById[b.Id]));

        var items = await MapManyWithVariantsAsync(fullPageProducts);
        var hasMore = page * pageSize < totalCount;
        return new PagedProductResponse(items, totalCount, page, pageSize, hasMore);
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
            .ToList();

        return Ok(await MapManyWithVariantsAsync(list));
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

        var siblings = await ProductVariantService.LoadSiblingsAsync(db, product);
        return Ok(ProductMapper.ToResponse(product, siblings: siblings));
    }

    private async Task<IReadOnlyList<ProductResponse>> MapManyWithVariantsAsync(
        IReadOnlyList<Domain.Entities.Product> products)
    {
        if (products.Count == 0)
            return [];

        var groupIds = products
            .Select(ProductVariantService.ResolveGroupId)
            .Distinct()
            .ToList();

        var grouped = await db.Products
            .ActiveProducts()
            .Where(p => groupIds.Contains(p.Id) || (p.VariantGroupId != null && groupIds.Contains(p.VariantGroupId.Value)))
            .OrderBy(p => p.VariantSortOrder)
            .ThenBy(p => p.VariantLabel)
            .ToListAsync();

        var siblingsByGroup = grouped
            .GroupBy(ProductVariantService.ResolveGroupId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<Domain.Entities.Product>)g.ToList());

        return products
            .Select(p =>
            {
                var groupId = ProductVariantService.ResolveGroupId(p);
                siblingsByGroup.TryGetValue(groupId, out var siblings);
                siblings ??= [p];
                return ProductMapper.ToResponse(p, siblings: siblings);
            })
            .ToList();
    }
}
