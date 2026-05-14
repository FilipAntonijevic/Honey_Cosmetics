using System.ComponentModel.DataAnnotations;

namespace HoneyCosmetics.Application.DTOs;


public record ProductRequest(
    [Required] string Name,
    string Description,
    [Range(0.01, 9999999)] decimal Price,
    string ImageUrl,
    int ProductTypeId,
    int? CategoryId);

public record ProductResponse(
    int Id,
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    int ProductTypeId,
    string ProductType,
    int? CategoryId,
    string Category,
    DateTime CreatedAt);

public record ProductQuery(string? Search, int? CategoryId, string? Sort);

public record CategoryResponse(int Id, string Name);
