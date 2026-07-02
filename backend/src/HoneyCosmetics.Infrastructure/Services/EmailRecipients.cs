namespace HoneyCosmetics.Infrastructure.Services;

/// <summary>
/// Helpers for storing/reading multiple email recipients in a single text field.
/// Admin unosi proizvoljan broj adresa; čuvaju se razdvojene novim redom, a mogu
/// biti razdvojene i zarezom/tačka-zarezom/razmakom pri unosu.
/// </summary>
public static class EmailRecipients
{
    private static readonly char[] Separators = [',', ';', '\n', '\r', '\t', ' '];

    /// <summary>Parse a raw stored/entered string into a de-duplicated list of addresses.</summary>
    public static List<string> Parse(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return [];

        return raw
            .Split(Separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Contains('@'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>Normalize a raw string into a canonical newline-separated form for storage.</summary>
    public static string Normalize(string? raw) => string.Join("\n", Parse(raw));

    /// <summary>First valid address from a stored multi-email field.</summary>
    public static string? First(string? raw) => Parse(raw).FirstOrDefault();

    /// <summary>Contact-form inbox: first info address, then legacy EmailAddress.</summary>
    public static string ResolveContactInbox(string? infoEmails, string? legacyEmailAddress, string fallback)
    {
        var info = First(infoEmails);
        if (!string.IsNullOrEmpty(info))
            return info;

        var legacy = (legacyEmailAddress ?? string.Empty).Trim();
        return string.IsNullOrEmpty(legacy) ? fallback : legacy;
    }

    /// <summary>Reply-to for customer-facing mail: first info address, then legacy.</summary>
    public static string ResolveInfoReplyTo(string? infoEmails, string? legacyEmailAddress, string fallback)
    {
        var info = First(infoEmails);
        if (!string.IsNullOrEmpty(info))
            return info;

        var legacy = (legacyEmailAddress ?? string.Empty).Trim();
        return string.IsNullOrEmpty(legacy) ? fallback : legacy;
    }
}
