namespace HoneyCosmetics.Domain.Entities;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public int ProductTypeId { get; set; }
    public ProductType? ProductType { get; set; }
    public List<Product> Products { get; set; } = new();
}
