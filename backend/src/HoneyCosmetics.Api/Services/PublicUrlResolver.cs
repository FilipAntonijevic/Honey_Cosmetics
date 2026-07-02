namespace HoneyCosmetics.Api.Services;

/// <summary>
/// Resolves the public base URLs used to build links in outgoing emails
/// (registration confirmation, password reset, product links, images).
///
/// Priority:
///   1. Explicit config value (<c>FrontendUrl</c> / <c>PublicApiUrl</c>) when set —
///      lets you pin a domain if ever needed.
///   2. The domain of the incoming request (scheme + host). Behind nginx this is
///      the real public domain, so links "just work" on the current server now and
///      automatically switch to honeycosmetics.rs once DNS points there — no redeploy.
///   3. A hardcoded fallback (only reached when there is no request context).
/// </summary>
public static class PublicUrlResolver
{
    private const string FrontendFallback = "https://filipantonijevic.github.io/Honey_Cosmetics";
    private const string ApiFallback = "http://localhost:5128";

    public static string ResolveFrontend(IConfiguration configuration, HttpRequest? request) =>
        Resolve(configuration["FrontendUrl"], request, FrontendFallback);

    public static string ResolvePublicApi(IConfiguration configuration, HttpRequest? request) =>
        Resolve(configuration["PublicApiUrl"], request, ApiFallback);

    private static string Resolve(string? configured, HttpRequest? request, string fallback)
    {
        var explicitUrl = configured?.Trim();
        if (!string.IsNullOrEmpty(explicitUrl))
            return explicitUrl.TrimEnd('/');

        if (request is not null && request.Host.HasValue)
            return $"{request.Scheme}://{request.Host.Value}".TrimEnd('/');

        return fallback;
    }
}
