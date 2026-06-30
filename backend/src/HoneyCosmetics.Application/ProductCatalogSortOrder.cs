using System.Text.RegularExpressions;

namespace HoneyCosmetics.Application;

/// <summary>
/// Hardcoded display order for specific product families (BIAB B01–B05, Top Coat).
/// </summary>
public static class ProductCatalogSortOrder
{
    private static readonly Regex BiabCodeRegex =
        new(@"biab\s+b0([1-5])\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex TopCoatBrilliantRegex =
        new(@"^top coat brilliant\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex TopCoatPlainRegex =
        new(@"^top coat\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static (string Group, int Order)? TryGet(string? name)
    {
        var baseName = ProductDisplayNaming.StripVariantFromName(name).Trim();
        if (baseName.Length == 0)
            return null;

        var biabMatch = BiabCodeRegex.Match(baseName);
        if (biabMatch.Success && int.TryParse(biabMatch.Groups[1].Value, out var biabOrder))
            return ("biab", biabOrder);

        if (TopCoatBrilliantRegex.IsMatch(baseName))
            return ("topcoat", 2);

        if (TopCoatPlainRegex.IsMatch(baseName) &&
            !baseName.Contains("colored", StringComparison.OrdinalIgnoreCase))
            return ("topcoat", 1);

        return null;
    }
}
