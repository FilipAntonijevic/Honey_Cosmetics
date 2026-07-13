using System.Text.RegularExpressions;
using HoneyCosmetics.Domain.Entities;

namespace HoneyCosmetics.Application;

public static partial class ProductDisplayNaming
{
    [GeneratedRegex(@"\s*[(\\-–]?\s*(\d+)\s*(ml|gr|g)\s*\)?\s*$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex TrailingVariantInNameRegex();

    [GeneratedRegex(@"(\d+)\s*(ml|gr|g)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex VariantTokenRegex();

    public static string? TryExtractVariantLabel(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var trimmed = text.Trim();
        var trailing = TrailingVariantInNameRegex().Match(trimmed);
        if (trailing.Success)
            return NormalizeVariantUnit(trailing.Groups[1].Value, trailing.Groups[2].Value);

        // Legacy: gramaža u nazivu ali ne nužno na kraju.
        Match? last = null;
        foreach (Match match in VariantTokenRegex().Matches(trimmed))
            last = match;
        if (last is null || !last.Success)
            return null;

        return NormalizeVariantUnit(last.Groups[1].Value, last.Groups[2].Value);
    }

    private static string NormalizeVariantUnit(string num, string unit)
    {
        var u = unit.ToLowerInvariant();
        if (u == "g")
            u = "gr";
        return $"{num}{u}";
    }

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

    public static string GetDisplayName(string name, string? variantLabel = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            return string.Empty;

        if (string.IsNullOrWhiteSpace(variantLabel))
            return name.Trim();

        return StripVariantFromName(name);
    }

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
