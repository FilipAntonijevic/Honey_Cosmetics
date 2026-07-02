using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace HoneyCosmetics.Api.Services;

public class ImageThumbnailService(IWebHostEnvironment env, ILogger<ImageThumbnailService> logger)
{
    private const int ThumbMaxWidth = 64;
    private const int MediumMaxWidth = 800;
    private static readonly string[] SkipExtensions = [".gif"];
    private static readonly string[] RasterExtensions = [".png", ".jpg", ".jpeg"];

    public string ImagesDirectory => Path.Combine(env.ContentRootPath, "images");
    public string ThumbsDirectory => Path.Combine(ImagesDirectory, "thumbs");
    public string MediumDirectory => Path.Combine(ImagesDirectory, "medium");

    public static string VariantFileName(string originalFileName) =>
        $"{Path.GetFileNameWithoutExtension(originalFileName)}.webp";

    public static string GetThumbnailUrl(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return string.Empty;
        var fileName = Path.GetFileName(imageUrl.Trim().TrimStart('/'));
        return string.IsNullOrEmpty(fileName) ? string.Empty : $"/images/thumbs/{VariantFileName(fileName)}";
    }

    public static string GetMediumUrl(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return string.Empty;
        var fileName = Path.GetFileName(imageUrl.Trim().TrimStart('/'));
        return string.IsNullOrEmpty(fileName) ? string.Empty : $"/images/medium/{VariantFileName(fileName)}";
    }

    public async Task GenerateAllVariantsAsync(string originalFileName, CancellationToken cancellationToken = default)
    {
        await GenerateThumbnailAsync(originalFileName, cancellationToken);
        await GenerateMediumAsync(originalFileName, cancellationToken);
    }

    public async Task<string?> GenerateThumbnailAsync(string originalFileName, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(ThumbsDirectory);
        var thumbPath = Path.Combine(ThumbsDirectory, VariantFileName(originalFileName));
        return await SaveResizedVariantAsync(
            originalFileName,
            thumbPath,
            ThumbMaxWidth,
            quality: 70,
            cancellationToken);
    }

    public async Task<string?> GenerateMediumAsync(string originalFileName, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(MediumDirectory);
        var mediumPath = Path.Combine(MediumDirectory, VariantFileName(originalFileName));
        return await SaveResizedVariantAsync(
            originalFileName,
            mediumPath,
            MediumMaxWidth,
            quality: 82,
            cancellationToken);
    }

    public async Task<string> NormalizeUploadToWebpAsync(
        string savedFileName,
        CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(savedFileName).ToLowerInvariant();
        if (ext is ".webp" or ".gif" || !RasterExtensions.Contains(ext))
            return savedFileName;

        var webpName = VariantFileName(savedFileName);
        var originalPath = Path.Combine(ImagesDirectory, savedFileName);
        var webpPath = Path.Combine(ImagesDirectory, webpName);

        try
        {
            using var image = await Image.LoadAsync(originalPath, cancellationToken);
            await image.SaveAsWebpAsync(
                webpPath,
                new WebpEncoder { Quality = 92 },
                cancellationToken);
            File.Delete(originalPath);
            await GenerateAllVariantsAsync(webpName, cancellationToken);
            return webpName;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "WebP conversion failed for upload {File}", savedFileName);
            return savedFileName;
        }
    }

    public async Task BackfillMissingThumbnailsAsync(CancellationToken cancellationToken = default)
    {
        if (!Directory.Exists(ImagesDirectory))
            return;

        Directory.CreateDirectory(ThumbsDirectory);
        Directory.CreateDirectory(MediumDirectory);

        foreach (var file in Directory.EnumerateFiles(ImagesDirectory))
        {
            var name = Path.GetFileName(file);
            if (string.IsNullOrEmpty(name) || name.StartsWith('.'))
                continue;

            var ext = Path.GetExtension(name).ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || SkipExtensions.Contains(ext))
                continue;

            var thumbWebp = Path.Combine(ThumbsDirectory, VariantFileName(name));
            if (!File.Exists(thumbWebp))
                await GenerateThumbnailAsync(name, cancellationToken);

            var mediumWebp = Path.Combine(MediumDirectory, VariantFileName(name));
            if (!File.Exists(mediumWebp))
                await GenerateMediumAsync(name, cancellationToken);
        }
    }

    private async Task<string?> SaveResizedVariantAsync(
        string originalFileName,
        string outputWebpPath,
        int maxWidth,
        int quality,
        CancellationToken cancellationToken)
    {
        var ext = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (SkipExtensions.Contains(ext))
            return null;

        var originalPath = Path.Combine(ImagesDirectory, originalFileName);
        if (!File.Exists(originalPath))
            return null;

        try
        {
            using var image = await Image.LoadAsync(originalPath, cancellationToken);
            var height = image.Height;
            var width = image.Width;

            if (width > maxWidth)
            {
                height = (int)Math.Round(height * (maxWidth / (double)width));
                width = maxWidth;
                image.Mutate(x => x.Resize(width, height));
            }

            await image.SaveAsWebpAsync(
                outputWebpPath,
                new WebpEncoder { Quality = quality },
                cancellationToken);

            return outputWebpPath;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "WebP variant failed for {File} (max {Max}px)", originalFileName, maxWidth);
            return null;
        }
    }
}
