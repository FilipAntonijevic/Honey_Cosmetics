using System.Globalization;
using System.Text;

namespace HoneyCosmetics.Application;

public static class ProductSearch
{
    private static readonly (string From, string To)[] SerbianReplacements =
    [
        ("đ", "dj"), ("Đ", "dj"),
        ("č", "c"), ("Č", "c"),
        ("ć", "c"), ("Ć", "c"),
        ("š", "s"), ("Š", "s"),
        ("ž", "z"), ("Ž", "z"),
    ];

    public static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        var value = text.Trim();
        foreach (var (from, to) in SerbianReplacements)
            value = value.Replace(from, to, StringComparison.Ordinal);

        var formD = value.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        foreach (var c in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }

        return sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
    }

    public static IReadOnlyList<string> Tokenize(string? query) =>
        Normalize(query)
            .Split([' ', '\t'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static bool MatchesName(string? productName, string? query)
    {
        var tokens = Tokenize(query);
        if (tokens.Count == 0)
            return true;

        var normalizedName = Normalize(productName);
        return tokens.All(token => normalizedName.Contains(token, StringComparison.Ordinal));
    }

    public static IEnumerable<T> FilterByName<T>(IEnumerable<T> items, string? query, Func<T, string?> nameSelector)
    {
        if (string.IsNullOrWhiteSpace(query))
            return items;

        return items.Where(item => MatchesName(nameSelector(item), query));
    }
}
