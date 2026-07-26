using HoneyCosmetics.Api.Services;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace HoneyCosmetics.Tests;

public class ProductImageTests
{
    private static readonly string[] ImageExtensions = [".webp", ".jpg", ".jpeg", ".png", ".gif"];

    [Theory]
    [InlineData("/images/balzam.webp", "/images/thumbs/balzam.webp", "/images/medium/balzam.webp")]
    [InlineData("/images/folder/serum.jpg", "/images/thumbs/serum.webp", "/images/medium/serum.webp")]
    [InlineData("images/kreme.PNG", "/images/thumbs/kreme.webp", "/images/medium/kreme.webp")]
    public void Thumbnail_and_medium_urls_are_derived_from_product_image_path(
        string imageUrl,
        string expectedThumb,
        string expectedMedium)
    {
        Assert.Equal(expectedThumb, ImageThumbnailService.GetThumbnailUrl(imageUrl));
        Assert.Equal(expectedMedium, ImageThumbnailService.GetMediumUrl(imageUrl));
    }

    [Fact]
    public void Empty_image_url_maps_to_empty_variant_urls()
    {
        Assert.Equal(string.Empty, ImageThumbnailService.GetThumbnailUrl(""));
        Assert.Equal(string.Empty, ImageThumbnailService.GetMediumUrl(null!));
    }

    [Fact]
    public async Task Seeded_product_images_resolve_to_existing_files_on_disk()
    {
        var imagesDir = CreateTempImagesDirectory(out var env);
        try
        {
            var mainFile = "product-main.webp";
            var extraFile = "product-extra.webp";
            await File.WriteAllBytesAsync(Path.Combine(imagesDir, mainFile), [0x52, 0x49, 0x46, 0x46]);
            await File.WriteAllBytesAsync(Path.Combine(imagesDir, extraFile), [0x52, 0x49, 0x46, 0x46]);

            using var fx = new OrdersTestFixture();
            var type = fx.SeedProductType();
            var product = fx.SeedProduct(
                name: "Test slika",
                imageUrl: $"/images/{mainFile}",
                productTypeId: type.Id);

            fx.Db.ProductImages.Add(new ProductImage
            {
                ProductId = product.Id,
                ImageUrl = $"/images/{extraFile}",
                SortOrder = 0,
            });
            await fx.Db.SaveChangesAsync();

            var loaded = await fx.Db.Products
                .Include(p => p.AdditionalImages)
                .SingleAsync(p => p.Id == product.Id);

            var urls = loaded.AdditionalImages
                .Select(i => i.ImageUrl)
                .Append(loaded.ImageUrl)
                .ToList();

            Assert.Equal(2, urls.Count);
            foreach (var url in urls)
            {
                var fileName = Path.GetFileName(url);
                var fullPath = Path.Combine(imagesDir, fileName);
                Assert.True(File.Exists(fullPath), $"Missing image file for {url}");
                Assert.True(new FileInfo(fullPath).Length > 0, $"Empty image file for {url}");
            }

            // Ensure helper can resolve paths relative to the API images root.
            var storage = new ImageStorage(env, new ConfigurationBuilder().Build());
            var service = new ImageThumbnailService(storage, NullLogger<ImageThumbnailService>.Instance);
            Assert.Equal(imagesDir, service.ImagesDirectory);
            Assert.True(File.Exists(Path.Combine(service.ImagesDirectory, mainFile)));
        }
        finally
        {
            Directory.Delete(Path.GetDirectoryName(imagesDir)!, recursive: true);
        }
    }

    [Fact]
    public void Api_images_directory_contains_readable_catalog_files()
    {
        var imagesDir = FindApiImagesDirectory();
        Assert.True(Directory.Exists(imagesDir), $"Images directory not found: {imagesDir}");

        var files = Directory.EnumerateFiles(imagesDir)
            .Where(f => ImageExtensions.Contains(Path.GetExtension(f), StringComparer.OrdinalIgnoreCase))
            .ToList();

        Assert.NotEmpty(files);

        var missingOrEmpty = files
            .Where(f => !File.Exists(f) || new FileInfo(f).Length == 0)
            .Select(Path.GetFileName)
            .ToList();

        Assert.True(
            missingOrEmpty.Count == 0,
            "Neprikazive / prazne slike: " + string.Join(", ", missingOrEmpty));
    }

    [Fact]
    public void Product_image_urls_in_catalog_folder_have_matching_files()
    {
        var imagesDir = FindApiImagesDirectory();
        var available = Directory.EnumerateFiles(imagesDir)
            .Select(Path.GetFileName)
            .Where(n => n is not null)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Tipični putanji koje frontend/ApiImage očekuju — fajl mora postojati da bi se prikazao.
        var referenced = available
            .Where(name => !string.Equals(name, "thumbs", StringComparison.OrdinalIgnoreCase))
            .Select(name => $"/images/{name}")
            .ToList();

        Assert.NotEmpty(referenced);

        foreach (var url in referenced)
        {
            var fileName = Path.GetFileName(url);
            Assert.True(
                available.Contains(fileName),
                $"Slika nije pronađena na disku za URL {url}");
        }
    }

    private static string CreateTempImagesDirectory(out TestWebHostEnvironment env)
    {
        var root = Path.Combine(Path.GetTempPath(), "honey-image-tests-" + Guid.NewGuid().ToString("N"));
        var images = Path.Combine(root, "images");
        Directory.CreateDirectory(images);
        env = new TestWebHostEnvironment { ContentRootPath = root };
        return images;
    }

    private static string FindApiImagesDirectory()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "backend", "src", "HoneyCosmetics.Api", "images");
            if (Directory.Exists(candidate))
                return candidate;

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate API images directory.");
    }
}
