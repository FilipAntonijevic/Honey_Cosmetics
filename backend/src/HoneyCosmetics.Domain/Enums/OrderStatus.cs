namespace HoneyCosmetics.Domain.Enums;

public enum OrderStatus
{
    Pending = 0,
    AwaitingPayment = 1,
    InsufficientFunds = 2,
    PaymentConfirmed = 3,
    Processing = 4,
    Shipped = 5,
    Delivered = 6,
    Returned = 7,
    Cancelled = 8,
    FailedDelivery = 9
}
