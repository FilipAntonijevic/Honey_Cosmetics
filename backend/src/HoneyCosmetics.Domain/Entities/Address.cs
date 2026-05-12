namespace HoneyCosmetics.Domain.Entities;

public class Address
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = "Serbia";
    public bool IsDefault { get; set; }
}
