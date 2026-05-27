using System.ComponentModel.DataAnnotations;
using HoneyCosmetics.Domain.Enums;

namespace HoneyCosmetics.Application.DTOs;

public record SitePopupResponse(
    int Id,
    string ImageUrl,
    string MobileImageUrl,
    string Type,
    int? ProductId,
    string? ProductName,
    string? CouponCode,
    bool IsActive,
    DateTime CreatedAt);

public record SitePopupCreateRequest(
    [Required] string ImageUrl,
    [Required] string MobileImageUrl,
    [Required] SitePopupType Type,
    int? ProductId,
    string? CouponCode,
    bool Activate = true);

public record ActiveSitePopupResponse(
    int Id,
    string ImageUrl,
    string MobileImageUrl,
    string Type,
    int? ProductId,
    string? CouponCode);
