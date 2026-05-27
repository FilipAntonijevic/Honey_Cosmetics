namespace HoneyCosmetics.Domain.Entities;

public class HomeSlideshowSlide
{
    public int Id { get; set; }
    /// <summary>Desktop / PC verzija slike.</summary>
    public string ImageUrl { get; set; } = string.Empty;
    /// <summary>Mobilna verzija slike (prikaz ≤768px).</summary>
    public string MobileImageUrl { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
