using System.IdentityModel.Tokens.Jwt;
using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, ITokenService tokenService, IEmailService emailService) : ControllerBase
{
    private readonly PasswordHasher<User> _passwordHasher = new();

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (await db.Users.AnyAsync(x => x.Email == request.Email))
        {
            return BadRequest("Email already exists.");
        }

        var user = new User
        {
            Email = request.Email.Trim().ToLowerInvariant(),
            FullName = request.FullName,
            Phone = request.Phone,
            DefaultAddress = request.DefaultAddress,
            Role = UserRole.User
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        db.Coupons.Add(new Coupon
        {
            Code = $"WELCOME-{user.Id.ToString()[..8].ToUpperInvariant()}",
            DiscountValue = 10,
            IsPercentage = true,
            FirstOrderOnly = true,
            ExpiresAt = DateTime.UtcNow.AddMonths(1)
        });

        await db.SaveChangesAsync();
        return Ok(CreateAuthResponse(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == request.Email.Trim().ToLowerInvariant());
        if (user is null)
        {
            return Unauthorized("Invalid credentials.");
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized("Invalid credentials.");
        }

        return Ok(CreateAuthResponse(user));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshTokenRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.RefreshToken == request.RefreshToken && x.RefreshTokenExpiresAt > DateTime.UtcNow);
        if (user is null)
        {
            return Unauthorized("Invalid refresh token.");
        }

        return Ok(CreateAuthResponse(user));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == request.Email.Trim().ToLowerInvariant());
        if (user is null)
        {
            return Ok();
        }

        user.ResetToken = Guid.NewGuid().ToString("N");
        user.ResetTokenExpiresAt = DateTime.UtcNow.AddHours(2);
        await db.SaveChangesAsync();

        var link = $"http://localhost:5173/reset-password?token={user.ResetToken}";
        await emailService.SendAsync(user.Email, "Reset password", $"Kliknite na link za reset lozinke: {link}");
        return Ok();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.ResetToken == request.Token && x.ResetTokenExpiresAt > DateTime.UtcNow);
        if (user is null)
        {
            return BadRequest("Token is invalid or expired.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        user.ResetToken = null;
        user.ResetTokenExpiresAt = null;
        await db.SaveChangesAsync();

        return Ok();
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        var accessToken = tokenService.CreateAccessToken(user);
        user.RefreshToken = tokenService.CreateRefreshToken();
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(14);
        db.SaveChanges();

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(accessToken);
        return new AuthResponse(
            accessToken,
            user.RefreshToken,
            jwt.ValidTo,
            new UserSummary(user.Id, user.Email, user.FullName, user.Role.ToString()));
    }
}
