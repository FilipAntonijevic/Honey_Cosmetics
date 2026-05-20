using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/home-slideshow")]
public class HomeSlideshowController(AppDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<HomeSlideshowSlideResponse>>> List()
    {
        var slides = await db.HomeSlideshowSlides
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .Select(x => new HomeSlideshowSlideResponse(x.Id, x.ImageUrl, x.SortOrder))
            .ToListAsync();
        return Ok(slides);
    }
}
