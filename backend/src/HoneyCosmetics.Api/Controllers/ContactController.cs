using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Infrastructure.Configurations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController(
    IEmailService emailService,
    IOptions<SendGridSettings> sendGridOptions) : ControllerBase
{
    public record CollaborationRequest(
        string FullName,
        string? Company,
        string Email,
        string? Phone,
        string Message);

    [HttpPost("collaboration")]
    public async Task<IActionResult> Collaboration([FromBody] CollaborationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Message))
            return BadRequest("Obavezna polja nisu popunjena.");

        var adminEmail = sendGridOptions.Value.AdminEmail;
        var companyLine = string.IsNullOrWhiteSpace(request.Company)
            ? ""
            : $"<tr><td style='color:#6b6b6b;padding:4px 0;'>Firma</td><td style='padding:4px 0 4px 16px;'>{System.Net.WebUtility.HtmlEncode(request.Company)}</td></tr>";
        var phoneLine = string.IsNullOrWhiteSpace(request.Phone)
            ? ""
            : $"<tr><td style='color:#6b6b6b;padding:4px 0;'>Telefon</td><td style='padding:4px 0 4px 16px;'>{System.Net.WebUtility.HtmlEncode(request.Phone)}</td></tr>";

        var html = $"""
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
              <h2 style="margin:0 0 1rem;font-size:1.3rem;color:#1a1a2e;">Nova saradnja — Honey Cosmetics</h2>
              <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                <tr><td style="color:#6b6b6b;padding:4px 0;">Ime i prezime</td><td style="padding:4px 0 4px 16px;">{System.Net.WebUtility.HtmlEncode(request.FullName)}</td></tr>
                {companyLine}
                <tr><td style="color:#6b6b6b;padding:4px 0;">Email</td><td style="padding:4px 0 4px 16px;"><a href="mailto:{request.Email}">{System.Net.WebUtility.HtmlEncode(request.Email)}</a></td></tr>
                {phoneLine}
              </table>
              <hr style="border:none;border-top:1px solid #e8dcd0;margin:1.2rem 0;" />
              <p style="font-weight:600;margin:0 0 0.4rem;">Poruka:</p>
              <p style="margin:0;line-height:1.7;white-space:pre-wrap;">{System.Net.WebUtility.HtmlEncode(request.Message)}</p>
            </div>
            """;

        await emailService.SendAsync(
            adminEmail,
            $"Saradnja: {request.FullName}",
            html);

        return Ok();
    }
}
