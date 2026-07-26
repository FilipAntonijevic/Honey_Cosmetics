using HoneyCosmetics.Application.DTOs;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Tests;

public class AuthControllerTests
{
    private const string Password = "SecurePass1";

    [Fact]
    public async Task Login_with_valid_credentials_returns_tokens_and_user()
    {
        using var fx = new AuthTestFixture();
        var email = "login.user@example.com";

        fx.Db.Users.Add(new User
        {
            Email = email,
            FirstName = "Ana",
            LastName = "Petrović",
            Role = UserRole.User,
            Country = "Srbija",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password),
        });
        await fx.Db.SaveChangesAsync();

        var result = await fx.Controller.Login(new LoginRequest(email, Password));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var auth = Assert.IsType<AuthResponse>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(auth.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(auth.RefreshToken));
        Assert.Equal(email, auth.User.Email);
        Assert.Equal("Ana Petrović", auth.User.FullName);
        Assert.Equal(nameof(UserRole.User), auth.User.Role);
    }

    [Fact]
    public async Task Login_with_invalid_password_is_rejected()
    {
        using var fx = new AuthTestFixture();
        var email = "login.bad@example.com";

        fx.Db.Users.Add(new User
        {
            Email = email,
            FirstName = "Ana",
            LastName = "Petrović",
            Role = UserRole.User,
            Country = "Srbija",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Password),
        });
        await fx.Db.SaveChangesAsync();

        var result = await fx.Controller.Login(new LoginRequest(email, "WrongPass1"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Register_creates_pending_registration()
    {
        using var fx = new AuthTestFixture();
        var email = "new.user@example.com";

        var result = await fx.Controller.Register(new RegisterRequest(
            Email: email,
            Password: Password,
            ConfirmPassword: Password,
            FirstName: "Mila",
            LastName: "Jović",
            PhoneNumber: "0611111111",
            Street: "Knez Mihailova 1",
            City: "Beograd",
            PostalCode: "11000",
            Country: "Srbija"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<RegisterResponse>(ok.Value);
        Assert.Contains("email", response.Message, StringComparison.OrdinalIgnoreCase);

        var pending = await fx.Db.PendingRegistrations.SingleAsync(x => x.Email == email);
        Assert.Equal("Mila", pending.FirstName);
        Assert.Equal("Jović", pending.LastName);
        Assert.Equal("0611111111", pending.PhoneNumber);
        Assert.False(string.IsNullOrWhiteSpace(pending.PasswordHash));
        Assert.False(string.IsNullOrWhiteSpace(pending.ConfirmationTokenHash));
        Assert.True(pending.ConfirmationTokenExpiresAt > DateTime.UtcNow);

        Assert.False(await fx.Db.Users.AnyAsync(x => x.Email == email));
    }

    [Fact]
    public async Task Register_sends_confirmation_email_to_user()
    {
        using var fx = new AuthTestFixture();
        var email = "mail.user@example.com";

        var result = await fx.Controller.Register(new RegisterRequest(
            Email: email,
            Password: Password,
            ConfirmPassword: Password,
            FirstName: "Ivana",
            LastName: "Marković",
            PhoneNumber: null,
            Street: null,
            City: null,
            PostalCode: null,
            Country: "Srbija"));

        Assert.IsType<OkObjectResult>(result.Result);

        var sent = Assert.Single(fx.Email.Sent);
        Assert.Equal(email, sent.To);
        Assert.Equal("Honey Cosmetics — Potvrdite registraciju", sent.Subject);
        Assert.Contains("Ivana", sent.Body);
        Assert.Contains("/confirm-email?token=", sent.Body);
        Assert.Contains("http://localhost:5173", sent.Body);
    }
}
