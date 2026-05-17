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
using Npgsql;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    ITokenService tokenService,
    IEmailService emailService,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<AuthController> logger) : ControllerBase
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

        var link = BuildConfirmationLink(token);
        try
        {
            await SendConfirmationEmailAsync(email, pending.FirstName, link);
        }
        catch (Exception ex)
        {
            db.PendingRegistrations.Remove(pending);
            await db.SaveChangesAsync();
            logger.LogError(ex, "Confirmation email failed for {Email}", email);
            return StatusCode(503, "Nismo mogli da pošaljemo email za potvrdu. Proverite SendGrid podešavanja i pokušajte ponovo.");
        }

        var devLink = environment.IsDevelopment() && !IsSendGridConfigured() ? link : null;
        return Ok(new RegisterResponse(
            devLink is null
                ? "Poslali smo vam email sa linkom za potvrdu. Kliknite na link da biste aktivirali nalog."
                : "Registracija je sačuvana. SendGrid nije podešen — koristite link ispod (samo u razvoju).",
            devLink));
    }

    [HttpPost("resend-confirmation")]
    public async Task<ActionResult<RegisterResponse>> ResendConfirmation(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email))
            return BadRequest("Nalog je već aktiviran. Prijavite se.");

        var pending = await db.PendingRegistrations.FirstOrDefaultAsync(x => x.Email == email);
        if (pending is null)
        {
            return Ok(new RegisterResponse(
                "Ako postoji registracija na čekanju, poslaćemo vam novi email."));
        }

        var token = CreateUrlSafeToken();
        pending.ConfirmationToken = token;
        pending.ConfirmationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
        await db.SaveChangesAsync();

        var link = BuildConfirmationLink(token);
        try
        {
            await SendConfirmationEmailAsync(email, pending.FirstName, link);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Resend confirmation email failed for {Email}", email);
            return StatusCode(503, "Nismo mogli da pošaljemo email. Pokušajte ponovo kasnije.");
        }

        var devLink = environment.IsDevelopment() && !IsSendGridConfigured() ? link : null;
        return Ok(new RegisterResponse(
            devLink is null
                ? "Poslali smo novi email sa linkom za potvrdu."
                : "Novi link za potvrdu (samo u razvoju):",
            devLink));
    }

    [HttpPost("confirm-email")]
    public async Task<ActionResult<AuthResponse>> ConfirmEmail(ConfirmEmailRequest request)
    {
        var pending = await db.PendingRegistrations.FirstOrDefaultAsync(x =>
            x.ConfirmationToken == request.Token &&
            x.ConfirmationTokenExpiresAt > DateTime.UtcNow);
        if (pending is null)
            return BadRequest("Link za potvrdu je nevažeći ili je istekao.");

        var email = pending.Email.Trim().ToLowerInvariant();
        var existingUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email == email);
        if (existingUser is not null)
        {
            await RemovePendingAsync(pending);
            return BadRequest("Nalog sa ovim emailom već postoji. Prijavite se.");
        }

        var user = new User
        {
            Email = email,
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

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUsersEmailUniqueViolation(ex))
        {
            logger.LogWarning("Confirm-email race for {Email}, returning existing session.", email);
            db.ChangeTracker.Clear();
            var activated = await db.Users.FirstAsync(x => x.Email == email);
            await RemovePendingByEmailAsync(email);
            await TryAddWelcomeCouponAsync(activated);
            return Ok(await CreateAuthResponseAsync(activated));
        }

        await TryAddWelcomeCouponAsync(user);
        return Ok(await CreateAuthResponseAsync(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email);
        if (user is not null)
        {
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized("Invalid credentials.");
            return Ok(await CreateAuthResponseAsync(user));
        }

        var pending = await db.PendingRegistrations.FirstOrDefaultAsync(x => x.Email == email);
        if (pending is not null && BCrypt.Net.BCrypt.Verify(request.Password, pending.PasswordHash))
            return Unauthorized("Potvrdite registraciju putem linka koji smo poslali na email.");

        return Unauthorized("Invalid credentials.");
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

        var link = $"{GetFrontendBaseUrl()}/reset-password?token={Uri.EscapeDataString(user.ResetToken)}";
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

    private async Task RemovePendingAsync(PendingRegistration pending)
    {
        var tracked = await db.PendingRegistrations.FindAsync(pending.Id);
        if (tracked is null) return;
        db.PendingRegistrations.Remove(tracked);
        await db.SaveChangesAsync();
    }

    private async Task RemovePendingByEmailAsync(string email)
    {
        var rows = await db.PendingRegistrations.Where(x => x.Email == email).ToListAsync();
        if (rows.Count == 0) return;
        db.PendingRegistrations.RemoveRange(rows);
        await db.SaveChangesAsync();
    }

    private async Task TryAddWelcomeCouponAsync(User user)
    {
        var prefix = $"WELCOME-{user.Id.ToString()[..8].ToUpperInvariant()}";
        if (await db.Coupons.AnyAsync(c => c.Code == prefix)) return;

        db.Coupons.Add(new Coupon
        {
            Code = prefix,
            DiscountValue = 10,
            IsPercentage = true,
            FirstOrderOnly = true,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddMonths(1),
        });
        await db.SaveChangesAsync();
    }

    private static bool IsUsersEmailUniqueViolation(DbUpdateException ex)
    {
        for (var inner = ex.InnerException; inner is not null; inner = inner.InnerException)
        {
            if (inner is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
                return pg.ConstraintName is null or "IX_Users_Email";
        }
        return false;
    }

    private string GetFrontendBaseUrl()
    {
        var url = configuration["FrontendUrl"]?.Trim();
        if (string.IsNullOrEmpty(url))
            url = "https://filipantonijevic.github.io/Honey_Cosmetics";
        return url.TrimEnd('/');
    }

    private string BuildConfirmationLink(string token) =>
        $"{GetFrontendBaseUrl()}/confirm-email?token={Uri.EscapeDataString(token)}";

    private bool IsSendGridConfigured()
    {
        var apiKey = configuration["SendGrid:ApiKey"];
        return !string.IsNullOrWhiteSpace(apiKey) &&
               !string.Equals(apiKey, "YOUR_SENDGRID_API_KEY", StringComparison.Ordinal);
    }

    private async Task SendConfirmationEmailAsync(string email, string firstName, string link)
    {
        if (environment.IsDevelopment() && !IsSendGridConfigured())
        {
            logger.LogWarning("SendGrid nije podešen. DEV link za potvrdu ({Email}): {Link}", email, link);
            return;
        }

        var body = BuildConfirmEmailBody(firstName, link);
        await emailService.SendAsync(email, "Honey Cosmetics — Potvrdite registraciju", body);
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
