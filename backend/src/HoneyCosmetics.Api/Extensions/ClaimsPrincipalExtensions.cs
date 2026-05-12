using System.Security.Claims;

namespace HoneyCosmetics.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : throw new UnauthorizedAccessException("Invalid user context");
    }
}
