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

    private static readonly Regex TopCoatFamilyRegex =
        new(@"\btop coat\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

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

    public static bool IsTopCoatFamily(string? name)
    {
        var baseName = ProductDisplayNaming.StripVariantFromName(name).Trim();
        return baseName.Length > 0 && TopCoatFamilyRegex.IsMatch(baseName);
    }

    public static int CompareNames(string? left, string? right)
    {
        left ??= string.Empty;
        right ??= string.Empty;

        var orderLeft = TryGet(left);
        var orderRight = TryGet(right);

        if (orderLeft is not null && orderRight is not null &&
            orderLeft.Value.Group == orderRight.Value.Group)
            return orderLeft.Value.Order.CompareTo(orderRight.Value.Order);

        var leftPinnedTop = orderLeft?.Group == "topcoat";
        var rightPinnedTop = orderRight?.Group == "topcoat";
        var leftOtherTop = orderLeft is null && IsTopCoatFamily(left);
        var rightOtherTop = orderRight is null && IsTopCoatFamily(right);

        if (leftPinnedTop && rightOtherTop) return -1;
        if (rightPinnedTop && leftOtherTop) return 1;

        return 0;
    }
}
