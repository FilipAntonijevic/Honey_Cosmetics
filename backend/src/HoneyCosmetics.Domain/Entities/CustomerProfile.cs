namespace HoneyCosmetics.Domain.Entities;

/// <summary>
/// Unified customer record for registered users and guest checkout emails.
/// </summary>
public class CustomerProfile
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public DateTime FirstSeenAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
}
