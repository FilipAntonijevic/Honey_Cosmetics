using System.ComponentModel.DataAnnotations;

namespace HoneyCosmetics.Application.DTOs;

public record RegisterAddressRequest(
    [Required] string Country,
    [Required] string City,
    [Required] string Street,
    [Required] string PostalCode);

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] string ConfirmPassword,
    [Required] string FirstName,
    [Required] string LastName,
    string? PhoneNumber,
    RegisterAddressRequest? Address);

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
    string? PostalCode);

public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, UserSummary User);

public record UserSummary(Guid Id, string Email, string FullName, string Role);
