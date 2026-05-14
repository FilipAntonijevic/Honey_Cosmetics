using HoneyCosmetics.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/test-email")]
public class TestEmailController : ControllerBase
{
    private readonly IEmailService _emailService;

    public TestEmailController(
        IEmailService emailService)
    {
        _emailService = emailService;
    }

    [HttpPost]
    public async Task<IActionResult> Send()
    {
        await _emailService.SendAsync(
            "filipdantonijevic@gmail.com",
            "Honey Cosmetics Test",
            """
            <h1>SendGrid radi!</h1>
            <p>Email servis je uspešno povezan.</p>
            """);

        return Ok(new
        {
            message = "Email sent"
        });
    }
}