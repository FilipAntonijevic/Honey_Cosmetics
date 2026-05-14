namespace HoneyCosmetics.Domain.Entities;

public class ProductType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Category> Categories { get; set; } = new();
    public List<Product> Products { get; set; } = new();
}
