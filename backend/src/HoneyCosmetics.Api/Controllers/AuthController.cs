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
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (request.Password != request.ConfirmPassword)
            return BadRequest("Passwords do not match.");

        if (await db.Users.AnyAsync(x => x.Email == request.Email.Trim().ToLowerInvariant()))
            return BadRequest("Email already in use.");

        var user = new User
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Role = UserRole.User
        };
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        if (request.Address is not null)
        {
            var formattedAddress = $"{request.Address.Street}, {request.Address.City} {request.Address.PostalCode}, {request.Address.Country}";
            user.DefaultAddress = formattedAddress;
            user.Addresses.Add(new Address
            {
                Country = request.Address.Country,
                City = request.Address.City,
                Street = request.Address.Street,
                PostalCode = request.Address.PostalCode,
                Label = "Kućna adresa",
                IsDefault = true
            });
        }

        db.Users.Add(user);
        db.Coupons.Add(new Coupon
        {
            Code = $"WELCOME-{user.Id.ToString()[..8].ToUpperInvariant()}",
            DiscountValue = 10,
            IsPercentage = true,
            FirstOrderOnly = true,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddMonths(1)
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
        var user = await db.Users
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();
        var addr = user.Addresses.FirstOrDefault(a => a.IsDefault)
                   ?? user.Addresses.FirstOrDefault();
        return Ok(new
        {
            user.FirstName,
            user.LastName,
            user.Email,
            user.PhoneNumber,
            Street  = addr?.Street,
            City    = addr?.City,
            PostalCode = addr?.PostalCode,
            Country = addr?.Country ?? "Srbija"
        });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = User.GetUserId();
        var user = await db.Users
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.PhoneNumber = request.PhoneNumber?.Trim();

        // Update or create default address
        var addr = user.Addresses.FirstOrDefault(a => a.IsDefault)
                   ?? user.Addresses.FirstOrDefault();
        if (addr is null)
        {
            addr = new Address { UserId = userId, Label = "Kućna adresa", IsDefault = true, Country = "Srbija" };
            user.Addresses.Add(addr);
        }
        addr.Street     = request.Street?.Trim() ?? string.Empty;
        addr.City       = request.City?.Trim() ?? string.Empty;
        addr.PostalCode = request.PostalCode?.Trim() ?? string.Empty;

        // Keep DefaultAddress string in sync
        var parts = new[] { addr.Street, addr.City, addr.PostalCode }.Where(s => !string.IsNullOrWhiteSpace(s));
        user.DefaultAddress = parts.Any() ? string.Join(", ", parts) : null;

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
            new UserSummary(user.Id, user.Email, user.FullName, user.Role.ToString()));
    }

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
