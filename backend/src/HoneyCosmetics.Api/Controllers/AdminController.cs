using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var totalOrders = await db.Orders.CountAsync();
        var pendingOrders = await db.Orders.CountAsync(x => x.Status.ToString().Contains("Pending"));
        var totalProducts = await db.Products.CountAsync();
        var latestNotifications = await db.Notifications.OrderByDescending(x => x.CreatedAt).Take(10).ToListAsync();

        return Ok(new
        {
            totalOrders,
            pendingOrders,
            totalProducts,
            latestNotifications
        });
    }
}
