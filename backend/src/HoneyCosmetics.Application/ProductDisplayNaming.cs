using System.Text.RegularExpressions;
using HoneyCosmetics.Domain.Entities;

namespace HoneyCosmetics.Application;

public static partial class ProductDisplayNaming
{
    [GeneratedRegex(@"\s*[\(\-–]?\s*(\d+)\s*(ml|gr)\s*\)?\s*$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex TrailingVariantInNameRegex();

    public static string StripVariantFromName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return string.Empty;

        var trimmed = name.Trim();
        var match = TrailingVariantInNameRegex().Match(trimmed);
        if (!match.Success)
            return trimmed;

        return trimmed[..match.Index].TrimEnd(' ', '-', '–', '(');
    }

    public static string GetDisplayName(string name, string? variantLabel = null) =>
        StripVariantFromName(name);

    public static string GetDisplayName(Product product) =>
        GetDisplayName(product.Name, product.VariantLabel);

    public static string FormatForRecord(Product product)
    {
        var name = GetDisplayName(product);
        return string.IsNullOrWhiteSpace(product.VariantLabel)
            ? name
            : $"{name} · {product.VariantLabel}";
    }

    public static string FormatForRecord(string name, string? variantLabel)
    {
        var clean = GetDisplayName(name, variantLabel);
        return string.IsNullOrWhiteSpace(variantLabel)
            ? clean
            : $"{clean} · {variantLabel}";
    }
}
