namespace HoneyCosmetics.Application.DTOs;

public record ProductRequest(string Name, string Description, decimal Price, string ImageUrl, int CategoryId);

public record ProductResponse(int Id, string Name, string Description, decimal Price, string ImageUrl, string Category, DateTime CreatedAt);

public record ProductQuery(string? Search, int? CategoryId, string? Sort);
