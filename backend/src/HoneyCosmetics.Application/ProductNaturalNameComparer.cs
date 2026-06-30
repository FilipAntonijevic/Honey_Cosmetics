using System.Text.RegularExpressions;

namespace HoneyCosmetics.Application;

/// <summary>
/// Natural sort for product codes in names (e.g. H01, H02, H10, B01).
/// </summary>
public sealed class ProductNaturalNameComparer : IComparer<string?>
{
    public static ProductNaturalNameComparer Instance { get; } = new();

    private static readonly Regex TokenRegex = new(@"(\d+|\D+)", RegexOptions.Compiled);

    public int Compare(string? x, string? y)
    {
        if (ReferenceEquals(x, y)) return 0;
        x ??= string.Empty;
        y ??= string.Empty;

        var hardcoded = CompareHardcodedOrder(x, y);
        if (hardcoded != 0)
            return hardcoded;

        var xTokens = TokenRegex.Matches(x);
        var yTokens = TokenRegex.Matches(y);
        var count = Math.Min(xTokens.Count, yTokens.Count);

        for (var i = 0; i < count; i++)
        {
            var xs = xTokens[i].Value;
            var ys = yTokens[i].Value;
            int result;
            if (long.TryParse(xs, out var xn) && long.TryParse(ys, out var yn))
                result = xn.CompareTo(yn);
            else
                result = string.Compare(xs, ys, StringComparison.OrdinalIgnoreCase);
            if (result != 0) return result;
        }

        return xTokens.Count.CompareTo(yTokens.Count);
    }

    private static int CompareHardcodedOrder(string x, string y)
    {
        var orderX = ProductCatalogSortOrder.TryGet(x);
        var orderY = ProductCatalogSortOrder.TryGet(y);
        if (orderX is null || orderY is null || orderX.Value.Group != orderY.Value.Group)
            return 0;

        return orderX.Value.Order.CompareTo(orderY.Value.Order);
    }
}
