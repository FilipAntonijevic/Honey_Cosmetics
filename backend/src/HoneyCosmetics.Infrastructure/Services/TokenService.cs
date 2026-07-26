using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace HoneyCosmetics.Infrastructure.Services;

public class TokenService(IConfiguration configuration) : ITokenService
{
    public string CreateAccessToken(User user)
    {
        var issuer = configuration["Jwt:Issuer"] ?? "HoneyCosmetics";
        var audience = configuration["Jwt:Audience"] ?? "HoneyCosmeticsClient";
        var secret = configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Missing Jwt:Secret");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateRefreshToken() => CreateOpaqueToken();

    public string CreateOpaqueToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    public string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
