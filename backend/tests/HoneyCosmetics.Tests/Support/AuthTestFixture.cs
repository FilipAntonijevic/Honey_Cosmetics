using HoneyCosmetics.Api.Controllers;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace HoneyCosmetics.Tests.Support;

internal sealed class AuthTestFixture : IDisposable
{
    public AppDbContext Db { get; }
    public CapturingEmailService Email { get; }
    public AuthController Controller { get; }

    public AuthTestFixture(string? environmentName = "Testing")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"auth-tests-{Guid.NewGuid():N}")
            .Options;

        Db = new AppDbContext(options);
        Email = new CapturingEmailService();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-secret-key-at-least-32-chars-long!!",
                ["Jwt:Issuer"] = "HoneyCosmetics",
                ["Jwt:Audience"] = "HoneyCosmeticsClient",
                ["FrontendUrl"] = "http://localhost:5173",
                ["Brevo:ApiKey"] = "test-brevo-api-key",
            })
            .Build();

        var environment = new TestWebHostEnvironment
        {
            EnvironmentName = environmentName ?? "Testing",
        };

        Controller = new AuthController(
            Db,
            new TokenService(configuration),
            Email,
            configuration,
            environment,
            NullLogger<AuthController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };
    }

    public void Dispose() => Db.Dispose();
}
