namespace HoneyCosmetics.Api.Services;

/// <summary>
/// Resolves the on-disk product/slideshow image store.
/// Prefer <c>Images:RootPath</c> (or env <c>Images__RootPath</c>) so publishes to
/// <c>/opt/honey-api</c> never wipe uploaded files living outside the publish dir.
/// </summary>
public sealed class ImageStorage(IWebHostEnvironment env, IConfiguration config)
{
    public string RootPath
    {
        get
        {
            var configured = config["Images:RootPath"]?.Trim();
            if (!string.IsNullOrEmpty(configured))
                return Path.GetFullPath(configured);

            return Path.Combine(env.ContentRootPath, "images");
        }
    }
}
