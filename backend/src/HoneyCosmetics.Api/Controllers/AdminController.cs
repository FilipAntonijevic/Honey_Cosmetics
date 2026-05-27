using HoneyCosmetics.Api.Services;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Application.Mapping;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Services;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(
    AppDbContext db,
    IWebHostEnvironment env,
    ImageThumbnailService thumbnails,
    IEmailService emailService,
    IConfiguration configuration,
    IOptions<SendGridSettings> sendGridOptions,
    ILogger<AdminController> logger) : ControllerBase
{
    // ── Orders ───────────────────────────────────────────────────────────────
    [HttpGet("orders")]
    public async Task<ActionResult<IReadOnlyCollection<AdminOrderResponse>>> GetOrders(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] bool exactId = false)
    {
        var query = db.Orders
            .Include(x => x.Items).ThenInclude(x => x.Product)
            .Include(x => x.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
            query = query.Where(x => x.Status == parsedStatus);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var raw = search.Trim();
            var term = raw.ToLower();
            var idTerm = raw.TrimStart('#');
            var searchById = idTerm.Length > 0 && idTerm.All(char.IsDigit);

            if (searchById && exactId && int.TryParse(idTerm, out var orderId))
            {
                query = query.Where(x => x.Id == orderId);
            }
            else
            {
                query = query.Where(x =>
                    (searchById && x.Id.ToString().Contains(idTerm))
                    || (x.User != null && (
                        x.User.Email.ToLower().Contains(term) ||
                        (x.User.FirstName + " " + x.User.LastName).ToLower().Contains(term)))
                    || (x.GuestEmail != null && x.GuestEmail.ToLower().Contains(term))
                    || (x.GuestName != null && x.GuestName.ToLower().Contains(term)));
            }
        }

        var orders = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        return Ok(orders.Select(MapAdminOrder));
    }

    // ── Users / Customers ──────────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyCollection<AdminCustomerListItem>>> GetUsers([FromQuery] string? search)
    {
        var customers = await AdminCustomerService.GetListAsync(db, search);
        return Ok(customers);
    }

    [HttpGet("users/{profileId:int}")]
    public async Task<ActionResult<AdminCustomerDetailResponse>> GetUserDetail(int profileId)
    {
        var detail = await AdminCustomerService.GetDetailAsync(db, profileId);
        if (detail is null) return NotFound();
        return Ok(detail);
    }

    [HttpPut("orders/{orderId:int}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);
        if (order is null) return NotFound();

        var error = await OrderStatusWorkflow.TryApplyStatusChangeAsync(
            db, order, request.Status, request.AdminDeliveryCost);
        if (error is not null)
            return BadRequest(error);

        await db.SaveChangesAsync();
        return Ok(new { order.Id, status = order.Status.ToString() });
    }

    // ── Products ─────────────────────────────────────────────────────────────
    [HttpGet("products")]
    public async Task<ActionResult<IReadOnlyCollection<ProductResponse>>> GetProducts()
    {
        var products = await db.Products
            .ActiveProducts()
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Include(x => x.AdditionalImages)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        return Ok(products.Select(MapProduct));
    }

    [HttpPost("products")]
    public async Task<ActionResult<ProductResponse>> CreateProduct([FromBody] ProductRequest request)
    {
        if (!await CategoryMatchesProductTypeAsync(request.ProductTypeId, request.CategoryId))
            return BadRequest("Kategorija mora pripadati izabranoj vrsti proizvoda.");

        Product product;
        bool restored;
        try
        {
            (product, restored) = await ProductCatalogService.CreateOrRestoreAsync(db, request);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        await db.SaveChangesAsync();
        await db.SyncAdditionalImagesAsync(product.Id, request.AdditionalImageUrls);
        await db.SaveChangesAsync();
        await db.Entry(product).Reference(p => p.Category).LoadAsync();
        await db.Entry(product).Reference(p => p.ProductType).LoadAsync();
        await db.Entry(product).Collection(p => p.AdditionalImages).LoadAsync();
        return Ok(new { product = MapProduct(product), restored });
    }

    [HttpPut("products/{id:int}")]
    public async Task<ActionResult<ProductResponse>> UpdateProduct(int id, [FromBody] ProductRequest request)
    {
        var product = await db.Products
            .ActiveProducts()
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (product is null) return NotFound();

        if (!await CategoryMatchesProductTypeAsync(request.ProductTypeId, request.CategoryId))
            return BadRequest("Kategorija mora pripadati izabranoj vrsti proizvoda.");

        var normalizedName = ProductCatalogService.NormalizeName(request.Name);
        if (!ProductCatalogService.NamesMatch(product.Name, normalizedName))
        {
            var nameConflict = await ProductCatalogService.GetActiveNameConflictAsync(db, normalizedName, id);
            if (nameConflict is not null)
                return BadRequest(nameConflict);

            var reservedByDeleted = await db.Products.AnyAsync(p =>
                p.Id != id && p.IsDeleted && p.Name == normalizedName);
            if (reservedByDeleted)
                return BadRequest(
                    "Proizvod sa tim imenom je uklonjen iz prodavnice. Kreirajte novi proizvod pod tim imenom da ga vratite.");
        }

        var stockBefore = product.StockQuantity;
        ProductCatalogService.ApplyRequest(product, request);

        await db.SaveChangesAsync();
        await db.SyncAdditionalImagesAsync(product.Id, request.AdditionalImageUrls);
        await db.SaveChangesAsync();
        await db.Entry(product).Reference(p => p.Category).LoadAsync();
        await db.Entry(product).Reference(p => p.ProductType).LoadAsync();
        await db.Entry(product).Collection(p => p.AdditionalImages).LoadAsync();

        await WishlistStockNotificationService.TryNotifyBackInStockAsync(
            db, emailService, configuration, sendGridOptions, product, stockBefore, logger);

        return Ok(MapProduct(product));
    }

    [HttpGet("products/{id:int}")]
    public async Task<ActionResult<ProductResponse>> GetProduct(int id)
    {
        var product = await db.Products
            .ActiveProducts()
            .Include(x => x.Category)
            .Include(x => x.ProductType)
            .Include(x => x.AdditionalImages)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (product is null) return NotFound();
        return Ok(MapProduct(product));
    }

    [HttpGet("products/{id:int}/stats")]
    public async Task<ActionResult<ProductStatsResponse>> GetProductStats(int id)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (product is null) return NotFound();

        var orderLines = await db.OrderItems
            .AsNoTracking()
            .Where(i => i.ProductId == id)
            .Join(
                db.Orders.AsNoTracking(),
                i => i.OrderId,
                o => o.Id,
                (i, o) => new { i.Quantity, i.UnitPrice, o.Status, o.Id })
            .ToListAsync();

        var deliveredLines = orderLines.Where(x => x.Status == OrderStatus.Delivered).ToList();
        var totalSold = deliveredLines.Sum(x => x.Quantity);
        var totalRevenue = deliveredLines.Sum(x => x.UnitPrice * x.Quantity);

        var receipts = await db.StockReceipts
            .AsNoTracking()
            .Where(r => r.ProductId == id)
            .Select(r => new { r.Quantity, r.TotalCost, r.ReceivedAt })
            .ToListAsync();

        var totalPurchasedQuantity = receipts.Sum(r => r.Quantity);
        var totalPurchaseSpend = receipts.Sum(r => r.TotalCost);
        var purchaseReceiptCount = receipts.Count;
        var pendingReceiptQuantity = receipts.Where(r => r.ReceivedAt == null).Sum(r => r.Quantity);

        decimal? averagePurchaseUnitCost = null;
        if (totalPurchasedQuantity > 0)
            averagePurchaseUnitCost = Math.Round(totalPurchaseSpend / totalPurchasedQuantity, 2);

        var unitCostForProfit = product.UnitCostPrice ?? averagePurchaseUnitCost ?? 0m;
        var totalCogs = deliveredLines.Sum(x => unitCostForProfit * x.Quantity);
        var totalProfit = totalRevenue - totalCogs;
        var profitPerUnit = totalSold > 0 ? Math.Round(totalProfit / totalSold, 2) : 0m;
        var averageSalePrice = totalSold > 0 ? Math.Round(totalRevenue / totalSold, 2) : (decimal?)null;
        var profitMarginPercent = totalRevenue > 0
            ? Math.Round(totalProfit / totalRevenue * 100m, 1)
            : (decimal?)null;

        var activeOrderQuantity = orderLines
            .Where(x => !OrderStatusWorkflow.IsFinal(x.Status))
            .Sum(x => x.Quantity);
        var returnedCancelledQuantity = orderLines
            .Where(x => x.Status is OrderStatus.Returned or OrderStatus.Cancelled)
            .Sum(x => x.Quantity);
        var deliveredOrderCount = deliveredLines.Select(x => x.Id).Distinct().Count();
        var totalOrdersWithProduct = orderLines.Select(x => x.Id).Distinct().Count();

        var wishlistCount = await db.Wishlists.AsNoTracking().CountAsync(w => w.ProductId == id);

        var costForMargin = product.UnitCostPrice ?? averagePurchaseUnitCost;
        decimal? unitMargin = null;
        decimal? marginPercent = null;
        if (costForMargin is not null)
        {
            unitMargin = product.Price - costForMargin.Value;
            marginPercent = product.Price > 0
                ? Math.Round(unitMargin.Value / product.Price * 100m, 1)
                : 0m;
        }

        var stockRetailValue = product.StockQuantity * product.Price;
        var stockUnitCost = product.UnitCostPrice ?? averagePurchaseUnitCost;
        decimal? stockCostValue = stockUnitCost is not null
            ? product.StockQuantity * stockUnitCost.Value
            : null;

        return Ok(new ProductStatsResponse(
            product.Id,
            product.Name,
            product.Price,
            product.UnitCostPrice,
            product.UnitTransportCost,
            averagePurchaseUnitCost,
            product.StockQuantity,
            product.OrderedQuantity,
            pendingReceiptQuantity,
            totalSold,
            totalRevenue,
            totalCogs,
            totalProfit,
            profitPerUnit,
            unitMargin,
            marginPercent,
            profitMarginPercent,
            averageSalePrice,
            activeOrderQuantity,
            returnedCancelledQuantity,
            deliveredOrderCount,
            totalOrdersWithProduct,
            wishlistCount,
            totalPurchasedQuantity,
            totalPurchaseSpend,
            purchaseReceiptCount,
            stockRetailValue,
            stockCostValue));
    }

    [HttpGet("products/{id:int}/pending-receipts")]
    public async Task<ActionResult<IReadOnlyCollection<PendingStockReceiptResponse>>> GetPendingReceipts(int id)
    {
        var exists = await db.Products.ActiveProducts().AnyAsync(p => p.Id == id);
        if (!exists) return NotFound();

        var list = await db.StockReceipts
            .AsNoTracking()
            .Where(r => r.ProductId == id && r.ReceivedAt == null)
            .OrderBy(r => r.CreatedAt)
            .Select(r => new PendingStockReceiptResponse(
                r.Id,
                r.Quantity,
                r.UnitCost,
                r.TransportCost,
                r.TotalCost,
                r.Note,
                r.CreatedAt))
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("products/{id:int}/stock-ledger")]
    public async Task<ActionResult<IReadOnlyCollection<ProductStockLedgerRowResponse>>> GetProductStockLedger(int id)
    {
        var exists = await db.Products.AnyAsync(p => p.Id == id);
        if (!exists) return NotFound();

        var rows = await ProductStockLedgerService.GetLedgerAsync(db, id);
        return Ok(rows);
    }

    [HttpPost("products/{id:int}/stock-purchase")]
    public async Task<IActionResult> StockPurchase(int id, [FromBody] StockPurchaseRequest request)
    {
        var product = await db.Products.ActiveProducts().FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound();

        var transportTotal = request.TotalTransportCost is > 0
            ? request.TotalTransportCost.Value
            : request.TransportCost;
        if (transportTotal <= 0 && request.TransportUnitCost > 0 && request.Quantity > 0)
            transportTotal = Math.Round(request.TransportUnitCost * request.Quantity, 2);

        await InventoryFinanceService.ApplyStockPurchaseAsync(
            db,
            product,
            request.Quantity,
            request.UnitCost,
            request.TransportUnitCost,
            transportTotal,
            request.TotalMerchandiseCost,
            request.TotalTransportCost ?? (transportTotal > 0 ? transportTotal : null),
            request.TotalPurchaseCost,
            request.Note);

        return Ok(new
        {
            product.Id,
            product.StockQuantity,
            product.OrderedQuantity,
            product.UnitCostPrice,
        });
    }

    [HttpPost("products/{id:int}/stock-write-off")]
    public async Task<IActionResult> StockWriteOff(int id, [FromBody] StockWriteOffRequest request)
    {
        var product = await db.Products.ActiveProducts().FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound();

        var error = await InventoryFinanceService.ApplyStockWriteOffAsync(
            db, product, request.Quantity, request.Note);
        if (error is not null)
            return BadRequest(error);

        return Ok(new
        {
            product.Id,
            product.StockQuantity,
            product.OrderedQuantity,
            product.UnitCostPrice,
        });
    }

    [HttpPost("products/{id:int}/stock-receipts/{receiptId:int}/arrival")]
    public async Task<IActionResult> ConfirmStockReceiptArrival(int id, int receiptId)
    {
        var product = await db.Products.ActiveProducts().FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound();

        var (error, stockBefore) = await InventoryFinanceService.ConfirmSingleStockArrivalAsync(db, product, receiptId);
        if (error is not null)
            return BadRequest(error);

        await WishlistStockNotificationService.TryNotifyBackInStockAsync(
            db, emailService, configuration, sendGridOptions, product, stockBefore, logger);

        return Ok(new
        {
            product.Id,
            product.StockQuantity,
            product.OrderedQuantity,
            product.UnitCostPrice,
        });
    }

    [HttpDelete("products/{id:int}/stock-receipts/{receiptId:int}")]
    public async Task<IActionResult> CancelPendingStockReceipt(int id, int receiptId)
    {
        var product = await db.Products.ActiveProducts().FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound();

        var error = await InventoryFinanceService.CancelPendingStockReceiptAsync(db, product, receiptId);
        if (error is not null)
            return BadRequest(error);

        return Ok(new
        {
            product.Id,
            product.StockQuantity,
            product.OrderedQuantity,
            product.UnitCostPrice,
        });
    }

    [HttpDelete("products/{id:int}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await db.Products.ActiveProducts().FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound();

        await ProductCatalogService.SoftDeleteAsync(db, product);
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
            .ActiveProducts()
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
            var existing = await db.Products.ActiveProducts().Where(p => ids.Contains(p.Id)).Select(p => p.Id).ToListAsync();
            var missing = ids.Except(existing).ToList();
            if (missing.Count > 0)
                return BadRequest($"Proizvodi sa Id-jevima [{string.Join(", ", missing)}] ne postoje.");
        }

        // Reset flags on previously flagged products not in the new list
        var current = await db.Products.ActiveProducts().Where(p => p.IsBestseller).ToListAsync();
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
            var prod = await db.Products.ActiveProducts().FirstAsync(p => p.Id == ids[i]);
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

    [HttpGet("home-screen/notification-banner")]
    public async Task<ActionResult<NotificationBannerUpdateRequest>> GetNotificationBanner()
    {
        var s = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync();
        return Ok(new NotificationBannerUpdateRequest(
            s?.NotificationBannerText ?? string.Empty,
            s?.NotificationBannerEnabled ?? true));
    }

    [HttpPut("home-screen/notification-banner")]
    public async Task<ActionResult<NotificationBannerUpdateRequest>> UpdateNotificationBanner(
        [FromBody] NotificationBannerUpdateRequest request)
    {
        var s = await db.SiteSettings.FirstOrDefaultAsync();
        if (s is null)
        {
            s = new SiteSettings { Id = 1 };
            db.SiteSettings.Add(s);
        }

        s.NotificationBannerText = (request.Text ?? string.Empty).Trim();
        s.NotificationBannerEnabled = request.Enabled;
        await db.SaveChangesAsync();

        return Ok(new NotificationBannerUpdateRequest(s.NotificationBannerText, s.NotificationBannerEnabled));
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

        if (request.FreeShippingThreshold is decimal threshold)
        {
            if (threshold < 0)
                return BadRequest("Vrednost korpe za besplatnu dostavu mora biti 0 ili više.");
            s.FreeShippingThreshold = threshold;
        }

        if (request.BankTransferRecipientName is not null)
            s.BankTransferRecipientName = request.BankTransferRecipientName.Trim();
        if (request.BankTransferRecipientAddress is not null)
            s.BankTransferRecipientAddress = request.BankTransferRecipientAddress.Trim();
        if (request.BankTransferAccountNumber is not null)
            s.BankTransferAccountNumber = request.BankTransferAccountNumber.Trim();
        if (request.BankTransferBankName is not null)
            s.BankTransferBankName = request.BankTransferBankName.Trim();
        if (request.BankTransferPurpose is not null)
            s.BankTransferPurpose = request.BankTransferPurpose.Trim();

        await db.SaveChangesAsync();
        return Ok(new SiteLinksResponse(
            s.InstagramUrl,
            s.TikTokUrl,
            s.EmailAddress,
            s.PhoneNumber,
            s.ComplaintsEmail,
            s.WhatsAppNumber,
            s.ViberNumber,
            s.NotificationsEmail,
            s.FreeShippingThreshold,
            s.NotificationBannerText,
            s.NotificationBannerEnabled,
            s.BankTransferRecipientName,
            s.BankTransferRecipientAddress,
            s.BankTransferAccountNumber,
            s.BankTransferBankName,
            s.BankTransferPurpose));
    }

    // ── Slideshow (početna) ────────────────────────────────────────────────
    [HttpGet("home-slideshow")]
    public async Task<ActionResult<IReadOnlyCollection<HomeSlideshowSlideResponse>>> GetHomeSlideshow()
    {
        var slides = await db.HomeSlideshowSlides
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .Select(x => new HomeSlideshowSlideResponse(x.Id, x.ImageUrl, x.MobileImageUrl, x.SortOrder))
            .ToListAsync();
        return Ok(slides);
    }

    [HttpPost("home-slideshow")]
    public async Task<ActionResult<HomeSlideshowSlideResponse>> CreateHomeSlideshowSlide(
        [FromBody] HomeSlideshowSlideRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ImageUrl))
            return BadRequest("Desktop slika je obavezna.");
        if (string.IsNullOrWhiteSpace(request.MobileImageUrl))
            return BadRequest("Mobilna slika je obavezna.");

        var maxOrder = await db.HomeSlideshowSlides.MaxAsync(x => (int?)x.SortOrder) ?? -1;
        var slide = new HomeSlideshowSlide
        {
            ImageUrl = request.ImageUrl.Trim(),
            MobileImageUrl = request.MobileImageUrl.Trim(),
            SortOrder = maxOrder + 1,
        };
        db.HomeSlideshowSlides.Add(slide);
        await db.SaveChangesAsync();
        return Ok(new HomeSlideshowSlideResponse(slide.Id, slide.ImageUrl, slide.MobileImageUrl, slide.SortOrder));
    }

    [HttpPut("home-slideshow/{id:int}")]
    public async Task<ActionResult<HomeSlideshowSlideResponse>> UpdateHomeSlideshowSlide(
        int id,
        [FromBody] HomeSlideshowSlideUpdateRequest request)
    {
        var slide = await db.HomeSlideshowSlides.FindAsync(id);
        if (slide is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.ImageUrl))
            return BadRequest("Desktop slika je obavezna.");
        if (string.IsNullOrWhiteSpace(request.MobileImageUrl))
            return BadRequest("Mobilna slika je obavezna.");

        slide.ImageUrl = request.ImageUrl.Trim();
        slide.MobileImageUrl = request.MobileImageUrl.Trim();
        await db.SaveChangesAsync();
        return Ok(new HomeSlideshowSlideResponse(slide.Id, slide.ImageUrl, slide.MobileImageUrl, slide.SortOrder));
    }

    [HttpPut("home-slideshow/order")]
    public async Task<IActionResult> ReorderHomeSlideshow([FromBody] HomeSlideshowReorderRequest request)
    {
        var ids = request.SlideIds?.ToList() ?? [];
        if (ids.Count == 0) return NoContent();

        var slides = await db.HomeSlideshowSlides.ToListAsync();
        var slideMap = slides.ToDictionary(x => x.Id);
        var missing = ids.Where(id => !slideMap.ContainsKey(id)).ToList();
        if (missing.Count > 0)
            return BadRequest($"Slike sa Id-jevima [{string.Join(", ", missing)}] ne postoje.");

        for (var i = 0; i < ids.Count; i++)
            slideMap[ids[i]].SortOrder = i;

        var ordered = new HashSet<int>(ids);
        var next = ids.Count;
        foreach (var slide in slides.Where(s => !ordered.Contains(s.Id)).OrderBy(s => s.SortOrder).ThenBy(s => s.Id))
            slide.SortOrder = next++;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("home-slideshow/{id:int}")]
    public async Task<IActionResult> DeleteHomeSlideshowSlide(int id)
    {
        var slide = await db.HomeSlideshowSlides.FindAsync(id);
        if (slide is null) return NotFound();
        db.HomeSlideshowSlides.Remove(slide);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Site popups ──────────────────────────────────────────────────────────
    [HttpGet("site-popups")]
    public async Task<ActionResult<IReadOnlyCollection<SitePopupResponse>>> GetSitePopups()
    {
        var popups = await db.SitePopups
            .AsNoTracking()
            .Include(p => p.Product)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new SitePopupResponse(
                p.Id,
                p.ImageUrl,
                p.MobileImageUrl,
                p.Type.ToString(),
                p.ProductId,
                p.Product != null ? p.Product.Name : null,
                p.CouponCode,
                p.IsActive,
                p.CreatedAt))
            .ToListAsync();
        return Ok(popups);
    }

    [HttpPost("site-popups")]
    public async Task<ActionResult<SitePopupResponse>> CreateSitePopup([FromBody] SitePopupCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ImageUrl))
            return BadRequest("PC slika je obavezna.");
        if (string.IsNullOrWhiteSpace(request.MobileImageUrl))
            return BadRequest("Mobilna slika je obavezna.");

        var validationError = await ValidateSitePopupRequestAsync(request.Type, request.ProductId, request.CouponCode);
        if (validationError is not null)
            return BadRequest(validationError);

        if (request.Activate)
            await DeactivateAllSitePopupsAsync();

        var popup = new SitePopup
        {
            ImageUrl = request.ImageUrl.Trim(),
            MobileImageUrl = request.MobileImageUrl.Trim(),
            Type = request.Type,
            ProductId = request.Type == SitePopupType.Product ? request.ProductId : null,
            CouponCode = request.Type == SitePopupType.Coupon
                ? request.CouponCode!.Trim().ToUpperInvariant()
                : null,
            IsActive = request.Activate,
            CreatedAt = DateTime.UtcNow,
        };
        db.SitePopups.Add(popup);
        await db.SaveChangesAsync();

        return Ok(await MapSitePopupResponseAsync(popup.Id));
    }

    [HttpPatch("site-popups/{id:int}/activate")]
    public async Task<IActionResult> ActivateSitePopup(int id)
    {
        var popup = await db.SitePopups.FindAsync(id);
        if (popup is null) return NotFound();

        await DeactivateAllSitePopupsAsync();
        popup.IsActive = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("site-popups/{id:int}/deactivate")]
    public async Task<IActionResult> DeactivateSitePopup(int id)
    {
        var popup = await db.SitePopups.FindAsync(id);
        if (popup is null) return NotFound();
        popup.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("site-popups/{id:int}")]
    public async Task<IActionResult> DeleteSitePopup(int id)
    {
        var popup = await db.SitePopups.FindAsync(id);
        if (popup is null) return NotFound();
        db.SitePopups.Remove(popup);
        await db.SaveChangesAsync();
        return NoContent();
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
        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        await thumbnails.GenerateAllVariantsAsync(fileName);

        var url = $"/images/{fileName}";
        return Ok(new
        {
            url,
            thumbnailUrl = ImageThumbnailService.GetThumbnailUrl(url),
            mediumUrl = ImageThumbnailService.GetMediumUrl(url),
        });
    }

    private Task<bool> CategoryMatchesProductTypeAsync(int productTypeId, int? categoryId)
    {
        if (categoryId is null) return Task.FromResult(true);
        return db.Categories.AnyAsync(c => c.Id == categoryId.Value && c.ProductTypeId == productTypeId);
    }

    private async Task DeactivateAllSitePopupsAsync()
    {
        var active = await db.SitePopups.Where(p => p.IsActive).ToListAsync();
        foreach (var p in active)
            p.IsActive = false;
    }

    private async Task<string?> ValidateSitePopupRequestAsync(
        SitePopupType type,
        int? productId,
        string? couponCode)
    {
        return type switch
        {
            SitePopupType.Product when productId is null or <= 0 =>
                "Izaberite proizvod.",
            SitePopupType.Product when !await db.Products.AnyAsync(p => p.Id == productId && !p.IsDeleted) =>
                "Proizvod nije pronađen.",
            SitePopupType.Coupon when string.IsNullOrWhiteSpace(couponCode) =>
                "Unesite kod kupona.",
            SitePopupType.Coupon when !await db.Coupons.AnyAsync(c =>
                c.Code == couponCode!.Trim().ToUpperInvariant()) =>
                "Kupon sa tim kodom ne postoji.",
            _ => null,
        };
    }

    private async Task<SitePopupResponse> MapSitePopupResponseAsync(int id)
    {
        var popup = await db.SitePopups
            .AsNoTracking()
            .Include(p => p.Product)
            .FirstAsync(p => p.Id == id);
        return new SitePopupResponse(
            popup.Id,
            popup.ImageUrl,
            popup.MobileImageUrl,
            popup.Type.ToString(),
            popup.ProductId,
            popup.Product?.Name,
            popup.CouponCode,
            popup.IsActive,
            popup.CreatedAt);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    private static ProductResponse MapProduct(Product p) => ProductMapper.ToResponse(p, includeUnitCost: true);

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
        o.FreeShippingApplied,
        o.FreeShippingDeliveryCost,
        o.CreatedAt,
        o.Items.Select(i => new OrderItemResponse(i.ProductId, i.Product?.Name ?? "—", i.Product?.ImageUrl, i.Quantity, i.UnitPrice)).ToList());
}

public record UpdateOrderStatusRequest(OrderStatus Status, decimal? AdminDeliveryCost = null);

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
    bool FreeShippingApplied,
    decimal? FreeShippingDeliveryCost,
    DateTime CreatedAt,
    IReadOnlyCollection<OrderItemResponse> Items);

