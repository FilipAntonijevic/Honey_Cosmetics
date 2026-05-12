using System.ComponentModel.DataAnnotations;

namespace HoneyCosmetics.Application.DTOs;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    [Required] string FullName,
    string? Phone,
    string? DefaultAddress);

public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

public record RefreshTokenRequest([Required] string RefreshToken);

public record ForgotPasswordRequest([Required, EmailAddress] string Email);

public record ResetPasswordRequest([Required] string Token, [Required, MinLength(6)] string NewPassword);

public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserSummary User);

public record UserSummary(Guid Id, string Email, string FullName, string Role);
