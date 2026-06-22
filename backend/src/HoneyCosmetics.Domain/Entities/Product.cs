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
    /// <summary>Zajednički ID grupe varijanti (obično ID prvog proizvoda u grupi).</summary>
    public int? VariantGroupId { get; set; }
    /// <summary>Gramaza / zapremina (npr. 15ml, 8ml, 38gr).</summary>
    public string? VariantLabel { get; set; }
    public int VariantSortOrder { get; set; }
    /// <summary>Da li je ova opcija (gramaza) podrazumevana u grupi varijanti — bira je admin.</summary>
    public bool IsDefaultVariant { get; set; }
    public List<ProductImage> AdditionalImages { get; set; } = new();
}
