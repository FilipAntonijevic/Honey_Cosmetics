namespace HoneyCosmetics.Application;

public static class ProductTypeNames
{
    public const string ManicureTools = "Alati za manikir";

    public static bool IsManicureTools(string? productTypeName) =>
        string.Equals(productTypeName, ManicureTools, StringComparison.OrdinalIgnoreCase);
}
