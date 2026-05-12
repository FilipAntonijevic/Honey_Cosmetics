namespace HoneyCosmetics.Domain.Entities;

public class Notification
{
    public int Id { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
