namespace HoneyCosmetics.Domain.Enums;

public enum ProductStockLedgerKind
{
    PurchaseOrdered = 0,
    PurchaseReceived = 1,
    WriteOff = 2,
    OrderPlaced = 3,
    OrderDelivered = 4,
    OrderRestored = 5,
}
