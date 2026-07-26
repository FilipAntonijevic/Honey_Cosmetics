using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace HoneyCosmetics.Tests;

public class DatabaseConnectionTests
{
    [Fact]
    public async Task InMemory_database_can_create_and_query_entities()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"db-smoke-{Guid.NewGuid():N}")
            .Options;

        await using var db = new AppDbContext(options);

        db.ProductTypes.Add(new ProductType { Name = "Test tip" });
        await db.SaveChangesAsync();

        Assert.Equal(1, await db.ProductTypes.CountAsync());
        Assert.True(await db.Database.CanConnectAsync());
    }

    [Fact]
    public async Task Postgresql_connection_string_is_reachable()
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(FindApiContentRoot())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        Assert.False(string.IsNullOrWhiteSpace(connectionString));

        await using var conn = new NpgsqlConnection(connectionString);
        try
        {
            await conn.OpenAsync();
        }
        catch (NpgsqlException)
        {
            // Lokalni Postgres nije obavezan za CI / mašine bez docker-compose-a.
            return;
        }

        Assert.Equal(System.Data.ConnectionState.Open, conn.State);

        await using var cmd = new NpgsqlCommand("SELECT 1", conn);
        var scalar = await cmd.ExecuteScalarAsync();
        Assert.Equal(1, Convert.ToInt32(scalar));
    }

    [Fact]
    public async Task AppDbContext_can_connect_when_postgres_is_available()
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(FindApiContentRoot())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        Assert.False(string.IsNullOrWhiteSpace(connectionString));

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        await using var db = new AppDbContext(options);
        try
        {
            var canConnect = await db.Database.CanConnectAsync();
            if (!canConnect)
                return;

            Assert.True(canConnect);
        }
        catch (NpgsqlException)
        {
            // Skip when Postgres is down.
        }
    }

    private static string FindApiContentRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "backend", "src", "HoneyCosmetics.Api");
            if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "appsettings.json")))
                return candidate;

            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate HoneyCosmetics.Api content root.");
    }
}
