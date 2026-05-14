using System.ComponentModel.DataAnnotations;

namespace HoneyCosmetics.Application.DTOs;

// Flat registration — address fields optional, stored directly on User
public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string ConfirmPassword,
    [Required] string FirstName,
    [Required] string LastName,
    string? PhoneNumber,
    string? Street,
    string? City,
    string? PostalCode,
    string? Country);

public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

public record RefreshTokenRequest([Required] string RefreshToken);

public record ForgotPasswordRequest([Required, EmailAddress] string Email);

public record ResetPasswordRequest([Required] string Token, [Required, MinLength(8)] string NewPassword);

public record UpdateProfileRequest(
    [Required] string FirstName,
    [Required] string LastName,
    string? PhoneNumber,
    string? Street,
    string? City,
    string? PostalCode,
    string? Country);

public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserSummary User);

// All user fields returned on login/register/refresh so frontend can prefill forms
public record UserSummary(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    string? PhoneNumber,
    string? Street,
    string? City,
    string? PostalCode,
    string? Country
);
