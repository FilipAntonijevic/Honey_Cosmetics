using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;

namespace HoneyCosmetics.Infrastructure.Services;

public static class OrderStatusWorkflow
{
    public static bool IsFinal(OrderStatus status) =>
        status is OrderStatus.Delivered or OrderStatus.Returned or OrderStatus.Cancelled;

    /// <summary>
    /// Menja status porudžbine: poslato ne dira lager; vraćeno/otkazano vraćaju zalihe;
    /// dostavljeno evidentira uplatu korisnika. Finalni statusi se ne mogu menjati.
    /// </summary>
    public static async Task<string?> TryApplyStatusChangeAsync(
        AppDbContext db,
        Order order,
        OrderStatus newStatus,
        CancellationToken ct = default)
    {
        if (IsFinal(order.Status))
            return "Status ove porudžbine je finalan i ne može se menjati.";

        var previous = order.Status;
        if (previous == newStatus)
            return null;

        order.Status = newStatus;

        if (newStatus is OrderStatus.Cancelled or OrderStatus.Returned)
            await InventoryFinanceService.RestoreStockForOrderAsync(db, order, ct);

        if (newStatus == OrderStatus.Delivered)
            await InventoryFinanceService.RecordDeliveredOrderFinanceAsync(db, order, ct);

        return null;
    }
}
