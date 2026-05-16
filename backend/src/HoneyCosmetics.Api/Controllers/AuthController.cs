using System.IdentityModel.Tokens.Jwt;
using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    ITokenService tokenService,
    IEmailService emailService,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
            return BadRequest("Passwords do not match.");

        var email = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(x => x.Email == email))
            return BadRequest("Email already in use.");

        var token = CreateUrlSafeToken();
        var pending = await db.PendingRegistrations.FirstOrDefaultAsync(x => x.Email == email);
        if (pending is null)
        {
            pending = new PendingRegistration { Email = email };
            db.PendingRegistrations.Add(pending);
        }

        pending.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        pending.FirstName = request.FirstName.Trim();
        pending.LastName = request.LastName.Trim();
        pending.PhoneNumber = request.PhoneNumber?.Trim();
        pending.Street = request.Street?.Trim();
        pending.City = request.City?.Trim();
        pending.PostalCode = request.PostalCode?.Trim();
        pending.Country = request.Country?.Trim() ?? "Srbija";
        pending.ConfirmationToken = token;
        pending.ConfirmationTokenExpiresAt = DateTime.UtcNow.AddHours(24);

        await db.SaveChangesAsync();

        var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";
        var link = $"{frontendUrl}/confirm-email?token={Uri.EscapeDataString(token)}";
        var body = BuildConfirmEmailBody(pending.FirstName, link);
        await emailService.SendAsync(email, "Honey Cosmetics — Potvrdite registraciju", body);

        return Ok(new RegisterResponse(
            "Poslali smo vam email sa linkom za potvrdu. Kliknite na link da biste aktivirali nalog."));
    }

    [HttpPost("confirm-email")]
    public async Task<ActionResult<AuthResponse>> ConfirmEmail(ConfirmEmailRequest request)
    {
        var pending = await db.PendingRegistrations.FirstOrDefaultAsync(x =>
            x.ConfirmationToken == request.Token &&
            x.ConfirmationTokenExpiresAt > DateTime.UtcNow);
        if (pending is null)
            return BadRequest("Link za potvrdu je nevažeći ili je istekao.");

        if (await db.Users.AnyAsync(x => x.Email == pending.Email))
        {
            db.PendingRegistrations.Remove(pending);
            await db.SaveChangesAsync();
            return BadRequest("Nalog sa ovim emailom već postoji. Prijavite se.");
        }

        var user = new User
        {
            Email = pending.Email,
            FirstName = pending.FirstName,
            LastName = pending.LastName,
            PhoneNumber = pending.PhoneNumber,
            Street = pending.Street,
            City = pending.City,
            PostalCode = pending.PostalCode,
            Country = pending.Country ?? "Srbija",
            Role = UserRole.User,
            PasswordHash = pending.PasswordHash,
        };

        db.Users.Add(user);
        db.PendingRegistrations.Remove(pending);

        db.Coupons.Add(new Coupon
        {
            Code = $"WELCOME-{user.Id.ToString()[..8].ToUpperInvariant()}",
            DiscountValue = 10,
            IsPercentage = true,
            FirstOrderOnly = true,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddMonths(1),
        });

        await db.SaveChangesAsync();
        return Ok(await CreateAuthResponseAsync(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == request.Email.Trim().ToLowerInvariant());
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized("Invalid credentials.");

        return Ok(await CreateAuthResponseAsync(user));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshTokenRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x =>
            x.RefreshToken == request.RefreshToken &&
            x.RefreshTokenExpiresAt > DateTime.UtcNow);
        if (user is null)
            return Unauthorized("Invalid or expired refresh token.");

        return Ok(await CreateAuthResponseAsync(user));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = User.GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is not null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiresAt = null;
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == request.Email.Trim().ToLowerInvariant());
        if (user is null)
            return Ok(); // Never reveal whether an email exists

        user.ResetToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "-").Replace("/", "_").Replace("=", "");
        user.ResetTokenExpiresAt = DateTime.UtcNow.AddHours(2);
        await db.SaveChangesAsync();

        var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:5173";
        var link = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(user.ResetToken)}";
        var body = BuildForgotPasswordEmail(user.FirstName, link);
        await emailService.SendAsync(user.Email, "Honey Cosmetics — Reset lozinke", body);
        return Ok();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x =>
            x.ResetToken == request.Token &&
            x.ResetTokenExpiresAt > DateTime.UtcNow);
        if (user is null)
            return BadRequest("Token is invalid or has expired.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.ResetToken = null;
        user.ResetTokenExpiresAt = null;
        // Invalidate existing sessions after password change
        user.RefreshToken = null;
        user.RefreshTokenExpiresAt = null;
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();
        return Ok(new
        {
            user.FirstName,
            user.LastName,
            user.Email,
            user.PhoneNumber,
            Street = user.Street ?? string.Empty,
            City = user.City ?? string.Empty,
            PostalCode = user.PostalCode ?? string.Empty,
            Country = user.Country ?? "Srbija"
        });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = User.GetUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.PhoneNumber = request.PhoneNumber?.Trim();
        user.Street = request.Street?.Trim();
        user.City = request.City?.Trim();
        user.PostalCode = request.PostalCode?.Trim();
        user.Country = request.Country?.Trim() ?? "Srbija";

        await db.SaveChangesAsync();
        return Ok();
    }

    private async Task<AuthResponse> CreateAuthResponseAsync(User user)
    {
        var accessToken = tokenService.CreateAccessToken(user);
        user.RefreshToken = tokenService.CreateRefreshToken();
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(14);
        await db.SaveChangesAsync();

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);
        return new AuthResponse(
            accessToken,
            user.RefreshToken,
            jwt.ValidTo,
            new UserSummary(
                user.Id,
                user.Email,
                user.FullName,
                user.Role.ToString(),
                user.PhoneNumber,
                user.Street,
                user.City,
                user.PostalCode,
                user.Country
            ));
    }

    private static string CreateUrlSafeToken() =>
        Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

    private static string BuildConfirmEmailBody(string name, string link) => $"""
        <div style="font-family:Georgia,serif;max-width:520px;margin:auto;background:#fff;padding:2rem;border:1px solid #f1e5d8;border-radius:12px;">
          <h2 style="color:#3f2b22;margin-bottom:0.3rem;">Honey Cosmetics</h2>
          <p style="color:#9b8276;font-size:0.85rem;margin-top:0;">Premium Beauty</p>
          <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.5rem 0;">
          <p>Zdravo {name},</p>
          <p>Hvala što ste se registrovali. Da bismo proverili da je ova email adresa vaša, kliknite na dugme ispod i aktivirajte nalog:</p>
          <a href="{link}" style="display:inline-block;background:#131313;color:#fff;padding:.75rem 1.5rem;border-radius:999px;text-decoration:none;margin:1rem 0;font-size:0.9rem;">Potvrdi registraciju</a>
          <p style="color:#9b8276;font-size:0.82rem;margin-top:1.5rem;">Link važi 24 sata. Ako niste vi kreirali nalog, ignorišite ovaj email.</p>
        </div>
        """;

    private static string BuildForgotPasswordEmail(string name, string link) => $"""
        <div style="font-family:Georgia,serif;max-width:520px;margin:auto;background:#fff;padding:2rem;border:1px solid #f1e5d8;border-radius:12px;">
          <h2 style="color:#3f2b22;margin-bottom:0.3rem;">Honey Cosmetics</h2>
          <p style="color:#9b8276;font-size:0.85rem;margin-top:0;">Premium Beauty</p>
          <hr style="border:none;border-top:1px solid #f1e5d8;margin:1.5rem 0;">
          <p>Zdravo {name},</p>
          <p>Primili smo zahtev za reset vaše lozinke. Kliknite na dugme ispod da nastavite:</p>
          <a href="{link}" style="display:inline-block;background:#131313;color:#fff;padding:.75rem 1.5rem;border-radius:999px;text-decoration:none;margin:1rem 0;font-size:0.9rem;">Resetuj lozinku</a>
          <p style="color:#9b8276;font-size:0.82rem;margin-top:1.5rem;">Link važi 2 sata. Ako niste zatražili reset lozinke, slobodno ignorišite ovaj email.</p>
        </div>
        """;
}
