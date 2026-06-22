using System.Text.RegularExpressions;
using HoneyCosmetics.Application;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Services;

public static partial class ProductVariantService
{
    public const string DefaultMl = "15ml";
    public const string DefaultGr = "15gr";

    [GeneratedRegex(@"(\d+)\s*(ml|gr)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex VariantTokenRegex();

    public static bool IsInVariantGroup(Product p) =>
        p.VariantGroupId is not null || !string.IsNullOrWhiteSpace(p.VariantLabel);

    public static int ResolveGroupId(Product p) =>
        p.VariantGroupId ?? p.Id;

    public static string StripVariantFromName(string name) =>
        ProductDisplayNaming.StripVariantFromName(name);

    /// <summary>Čist naziv proizvoda bez gramaze.</summary>
    public static string GetDisplayName(string name, string? variantLabel = null) =>
        ProductDisplayNaming.GetDisplayName(name, variantLabel);

    public static string GetDisplayName(Product product) =>
        ProductDisplayNaming.GetDisplayName(product);

    /// <summary>Za evidenciju (ledger, email): naziv i gramaza odvojeno.</summary>
    public static string FormatForRecord(Product product) =>
        ProductDisplayNaming.FormatForRecord(product);

    public static string FormatForRecord(string name, string? variantLabel) =>
        ProductDisplayNaming.FormatForRecord(name, variantLabel);

    public static string? TryExtractVariantLabel(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var match = VariantTokenRegex().Match(text.Trim());
        if (!match.Success)
            return null;

        return $"{match.Groups[1].Value}{match.Groups[2].Value.ToLowerInvariant()}";
    }

    public static string? NormalizeVariantLabel(string? label)
    {
        if (string.IsNullOrWhiteSpace(label))
            return null;

        var extracted = TryExtractVariantLabel(label);
        return extracted ?? label.Trim();
    }

    public static void NormalizeProductNaming(Product product)
    {
        var extracted = TryExtractVariantLabel(product.Name);
        if (string.IsNullOrWhiteSpace(product.VariantLabel) && extracted is not null)
            product.VariantLabel = extracted;

        product.VariantLabel = NormalizeVariantLabel(product.VariantLabel);
        product.Name = StripVariantFromName(product.Name);
    }

    public static async Task<IReadOnlyList<Product>> LoadSiblingsAsync(
        AppDbContext db,
        Product product,
        CancellationToken ct = default)
    {
        if (!IsInVariantGroup(product))
            return [product];

        var groupId = ResolveGroupId(product);
        return await db.Products
            .ActiveProducts()
            .Where(x => x.Id == groupId || x.VariantGroupId == groupId)
            .OrderBy(x => x.VariantSortOrder)
            .ThenBy(x => x.VariantLabel)
            .ToListAsync(ct);
    }

    public static Product PickDefaultVariant(IReadOnlyList<Product> siblings)
    {
        if (siblings.Count == 0)
            throw new ArgumentException("No variants.", nameof(siblings));

        var adminDefault = siblings.FirstOrDefault(s => s.IsDefaultVariant);
        if (adminDefault is not null)
            return adminDefault;

        var preferred = siblings.FirstOrDefault(s =>
            string.Equals(s.VariantLabel, DefaultMl, StringComparison.OrdinalIgnoreCase)
            || string.Equals(s.VariantLabel, DefaultGr, StringComparison.OrdinalIgnoreCase));
        return preferred ?? siblings[0];
    }

    public static int VariantSortKey(string? label)
    {
        if (string.IsNullOrWhiteSpace(label))
            return 0;

        var normalized = label.Trim().ToLowerInvariant();
        return normalized switch
        {
            "15ml" => 10,
            "15gr" => 10,
            "8ml" => 20,
            "38gr" => 30,
            _ => 100,
        };
    }

    public static async Task EnsureVariantGroupAsync(
        AppDbContext db,
        Product product,
        int? requestedGroupId,
        string? variantLabel,
        int variantSortOrder,
        CancellationToken ct = default)
    {
        product.VariantLabel = NormalizeVariantLabel(
            string.IsNullOrWhiteSpace(variantLabel) ? null : variantLabel);
        product.VariantSortOrder = variantSortOrder > 0
            ? variantSortOrder
            : VariantSortKey(product.VariantLabel);

        if (product.VariantLabel is null)
        {
            product.VariantGroupId = null;
            product.VariantSortOrder = 0;
            return;
        }

        if (requestedGroupId is int groupId && groupId > 0)
        {
            var anchor = await db.Products.ActiveProducts()
                .FirstOrDefaultAsync(p => p.Id == groupId, ct)
                ?? throw new InvalidOperationException("Grupa varijanti nije pronađena.");

            var resolvedGroupId = anchor.VariantGroupId ?? anchor.Id;
            product.VariantGroupId = resolvedGroupId;

            if (anchor.Id != resolvedGroupId && anchor.VariantGroupId is null)
            {
                anchor.VariantGroupId = resolvedGroupId;
            }
        }
        else if (product.Id > 0)
        {
            product.VariantGroupId ??= product.Id;
        }
    }

    public static async Task FinalizeNewProductVariantGroupAsync(
        AppDbContext db,
        Product product,
        CancellationToken ct = default)
    {
        if (product.VariantLabel is null)
            return;

        product.VariantGroupId ??= product.Id;

        var anchor = await db.Products.FindAsync([product.VariantGroupId.Value], ct);
        if (anchor is not null && anchor.VariantGroupId is null && anchor.Id != product.Id)
            anchor.VariantGroupId = product.VariantGroupId;
    }

    public static async Task<string?> ValidateVariantAsync(
        AppDbContext db,
        Product product,
        CancellationToken ct = default)
    {
        if (product.VariantLabel is null)
            return null;

        var groupId = product.VariantGroupId ?? product.Id;
        var duplicate = await db.Products.ActiveProducts()
            .AnyAsync(p =>
                p.Id != product.Id
                && (p.Id == groupId || p.VariantGroupId == groupId)
                && p.VariantLabel == product.VariantLabel, ct);
        if (duplicate)
            return "Proizvod sa tom gramazom već postoji u ovoj grupi varijanti.";

        return null;
    }
}
