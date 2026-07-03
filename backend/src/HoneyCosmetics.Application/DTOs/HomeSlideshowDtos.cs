namespace HoneyCosmetics.Application.DTOs;

public record HomeSlideshowSlideResponse(
    int Id,
    string ImageUrl,
    string MobileImageUrl,
    string LinkUrl,
    int SortOrder);

public record HomeSlideshowSlideRequest(string ImageUrl, string MobileImageUrl, string? LinkUrl);

public record HomeSlideshowSlideUpdateRequest(string ImageUrl, string MobileImageUrl, string? LinkUrl);

public record HomeSlideshowReorderRequest(IReadOnlyList<int> SlideIds);
