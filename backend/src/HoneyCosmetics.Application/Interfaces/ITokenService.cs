using HoneyCosmetics.Domain.Entities;

namespace HoneyCosmetics.Application.Interfaces;

public interface ITokenService
{
    string CreateAccessToken(User user);
    string CreateRefreshToken();
}
