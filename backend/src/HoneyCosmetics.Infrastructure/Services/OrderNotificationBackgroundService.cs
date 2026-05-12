using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HoneyCosmetics.Infrastructure.Services;

public class OrderNotificationBackgroundService(IServiceScopeFactory scopeFactory, ILogger<OrderNotificationBackgroundService> logger) : BackgroundService
{
    private DateTime _lastCheck = DateTime.UtcNow.AddMinutes(-1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var newOrders = await db.Orders.CountAsync(x => x.CreatedAt > _lastCheck, stoppingToken);
            if (newOrders > 0)
            {
                logger.LogInformation("Live notification: {Count} new order(s) detected.", newOrders);
            }

            _lastCheck = DateTime.UtcNow;
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
