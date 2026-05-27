namespace HoneyCosmetics.Application.DTOs;

public record HomeSlideshowSlideResponse(
    int Id,
    string ImageUrl,
    string MobileImageUrl,
    int SortOrder);

public record HomeSlideshowSlideRequest(string ImageUrl, string MobileImageUrl);

public record HomeSlideshowSlideUpdateRequest(string ImageUrl, string MobileImageUrl);

public record HomeSlideshowReorderRequest(IReadOnlyList<int> SlideIds);
