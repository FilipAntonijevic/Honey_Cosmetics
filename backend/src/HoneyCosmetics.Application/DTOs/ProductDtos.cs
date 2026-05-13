using System.ComponentModel.DataAnnotations;

namespace HoneyCosmetics.Application.DTOs;

public record ProductRequest(
    [Required] string Name,
    string Description,
    [Range(0.01, 9999999)] decimal Price,
    string ImageUrl,
    [Required] int CategoryId,
    string? ProductType);

public record ProductResponse(int Id, string Name, string Description, decimal Price, string ImageUrl, int CategoryId, string Category, string? ProductType, DateTime CreatedAt);

public record ProductQuery(string? Search, int? CategoryId, string? Sort);

public record CategoryResponse(int Id, string Name);
