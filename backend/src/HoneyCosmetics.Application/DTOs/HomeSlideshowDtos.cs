namespace HoneyCosmetics.Application.DTOs;

public record HomeSlideshowSlideResponse(int Id, string ImageUrl, int SortOrder);

public record HomeSlideshowSlideRequest(string ImageUrl);

public record HomeSlideshowReorderRequest(IReadOnlyList<int> SlideIds);
