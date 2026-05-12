using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Tests;

public class DomainModelTests
{
    [Fact]
    public void OrderStatus_Contains_All_Required_Workflow_States()
    {
        var statuses = Enum.GetNames<OrderStatus>();

        Assert.Contains("Pending", statuses);
        Assert.Contains("AwaitingPayment", statuses);
        Assert.Contains("InsufficientFunds", statuses);
        Assert.Contains("PaymentConfirmed", statuses);
        Assert.Contains("Processing", statuses);
        Assert.Contains("Shipped", statuses);
        Assert.Contains("Delivered", statuses);
        Assert.Contains("Returned", statuses);
        Assert.Contains("Cancelled", statuses);
        Assert.Contains("FailedDelivery", statuses);
    }

    [Fact]
    public void New_User_Defaults_To_User_Role()
    {
        var user = new User();
        Assert.Equal(UserRole.User, user.Role);
    }
}
