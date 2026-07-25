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

    /// <summary>
    /// Contact-form delivery inbox (single): dedicated ContactEmail first, then public
    /// info address, then legacy EmailAddress, then Brevo admin fallback.
    /// </summary>
    public static string ResolveContactInbox(
        string? contactEmail,
        string? infoEmails,
        string? legacyEmailAddress,
        string fallback)
    {
        var inboxes = ResolveContactInboxes(contactEmail, infoEmails, legacyEmailAddress, fallback);
        return inboxes.Count > 0 ? inboxes[0] : (fallback ?? string.Empty).Trim();
    }

    /// <summary>
    /// Contact-form delivery inboxes (all): dedicated ContactEmail list when set;
    /// otherwise one address from info / legacy / fallback.
    /// Public InfoEmails may be a branded address without working MX — ContactEmail
    /// should point at a real mailbox (e.g. Gmail) until domain MX/forwarding exists.
    /// </summary>
    public static List<string> ResolveContactInboxes(
        string? contactEmail,
        string? infoEmails,
        string? legacyEmailAddress,
        string fallback)
    {
        var dedicated = Parse(contactEmail);
        if (dedicated.Count > 0)
            return dedicated;

        var info = First(infoEmails);
        if (!string.IsNullOrEmpty(info))
            return [info];

        var legacy = (legacyEmailAddress ?? string.Empty).Trim();
        if (!string.IsNullOrEmpty(legacy))
            return [legacy];

        var fb = (fallback ?? string.Empty).Trim();
        return string.IsNullOrEmpty(fb) ? [] : [fb];
    }

    /// <summary>Public / mailto reply address: first info address, then legacy.</summary>
    public static string ResolveInfoReplyTo(string? infoEmails, string? legacyEmailAddress, string fallback)
    {
        var info = First(infoEmails);
        if (!string.IsNullOrEmpty(info))
            return info;

        var legacy = (legacyEmailAddress ?? string.Empty).Trim();
        return string.IsNullOrEmpty(legacy) ? fallback : legacy;
    }
}
