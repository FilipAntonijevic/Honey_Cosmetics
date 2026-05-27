namespace HoneyCosmetics.Domain.Entities;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? UnitCostPrice { get; set; }
    /// <summary>Podrazumevana cena transporta po komadu (nabavka).</summary>
    public decimal? UnitTransportCost { get; set; }
    public int StockQuantity { get; set; }
    /// <summary>Količina poručena kod dobavljača, još nije na lageru.</summary>
    public int OrderedQuantity { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public int ProductTypeId { get; set; }
    public ProductType? ProductType { get; set; }
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    public bool IsBestseller { get; set; }
    public int BestsellerSortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public List<ProductImage> AdditionalImages { get; set; } = new();
}
