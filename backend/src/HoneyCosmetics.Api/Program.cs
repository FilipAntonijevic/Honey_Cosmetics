using System.Text;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Api.Services;
using HoneyCosmetics.Infrastructure.Services;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

//
// Controllers & Swagger
//
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

//
// Database
//
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

//
// Configurations
//
builder.Services.Configure<SendGridSettings>(
    builder.Configuration.GetSection("SendGrid"));

//
// Services
//
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddSingleton<ImageThumbnailService>();

//
// CORS
//
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        var origins = new List<string>
        {
            "http://localhost:5173",
            "https://filipantonijevic.github.io",
        };

        var configured = builder.Configuration.GetSection("CorsOrigins").Get<string[]>();
        if (configured is { Length: > 0 })
            origins.AddRange(configured);

        var frontendUrl = builder.Configuration["FrontendUrl"];
        if (!string.IsNullOrWhiteSpace(frontendUrl))
            origins.Add(frontendUrl.Trim());

        var allowedOrigins = origins.Distinct(StringComparer.OrdinalIgnoreCase).ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (builder.Environment.IsDevelopment())
        {
            // localhost (Vite) + GitHub Pages / ngrok test sa konfigurisanim origin-ima
            policy
                .SetIsOriginAllowed(origin =>
                {
                    if (allowedOrigins.Contains(origin))
                        return true;
                    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                        return false;
                    return uri.Host is "localhost" or "127.0.0.1";
                })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            policy
                .WithOrigins(origins.Distinct(StringComparer.OrdinalIgnoreCase).ToArray())
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

//
// JWT Authentication
//
var secret =
    builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException(
        "Missing Jwt:Secret");

var key = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes(secret));

builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer =
                    builder.Configuration["Jwt:Issuer"],

                ValidAudience =
                    builder.Configuration["Jwt:Audience"],

                IssuerSigningKey = key,

                RoleClaimType =
                    System.Security.Claims.ClaimTypes.Role
            };
    });

//
// Authorization
//
builder.Services.AddAuthorization();

//
// Upload size limits (dozvoli veće originalne slike, npr. PNG)
//
const long MaxUploadBytes = 50L * 1024 * 1024; // 50 MB
builder.Services.Configure<Microsoft.AspNetCore.Server.Kestrel.Core.KestrelServerOptions>(options =>
{
    options.Limits.MaxRequestBodySize = MaxUploadBytes;
});
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = MaxUploadBytes;
});

var app = builder.Build();

//
// Forwarded headers (nginx reverse proxy)
// Da bi request.Scheme/Host bili tačni iza nginx-a (za auto-detekciju domena u
// linkovima mejlova). nginx mora slati: proxy_set_header Host $host; i
// proxy_set_header X-Forwarded-Proto $scheme;
//
var forwardedOptions = new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions
{
    ForwardedHeaders =
        Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
        Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto,
};
// Verujemo lokalnom nginx-u na istom hostu.
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedOptions);

var configuredFrontendUrl = app.Configuration["FrontendUrl"];
app.Logger.LogInformation(
    "Linkovi u emailu (potvrda, reset lozinke): {FrontendUrl}",
    string.IsNullOrWhiteSpace(configuredFrontendUrl)
        ? "(auto-detekcija iz domena zahteva)"
        : configuredFrontendUrl);

//
// Database Seed
//
using (var scope = app.Services.CreateScope())
{
    var db =
        scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

    // Primeni EF migracije (EnsureCreated ne koristi migracije i lako ostane u raskoraku sa šemom).
    db.Database.Migrate();

    //
    // Hardcoded admin accounts — Admin:Accounts in appsettings (sync on every startup)
    //
    foreach (var item in builder.Configuration.GetSection("Admin:Accounts").GetChildren())
    {
        var email = item["Email"]?.Trim().ToLowerInvariant();
        var password = item["Password"];
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            continue;

        var firstName = string.IsNullOrWhiteSpace(item["FirstName"])
            ? "Admin"
            : item["FirstName"]!.Trim();
        var lastName = string.IsNullOrWhiteSpace(item["LastName"])
            ? "User"
            : item["LastName"]!.Trim();

        var user = db.Users.FirstOrDefault(x => x.Email == email);
        if (user is null)
        {
            user = new User
            {
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                Role = UserRole.Admin,
                Country = "Srbija",
                PhoneNumber = item["PhoneNumber"]?.Trim(),
            };
            db.Users.Add(user);
        }
        else
        {
            user.Role = UserRole.Admin;
            user.FirstName = firstName;
            user.LastName = lastName;
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
    }

    //
    // Podrazumevano stanje: aktivni proizvodi bez zaliha dobijaju 50 komada
    //
    foreach (var product in db.Products.Where(p => !p.IsDeleted && p.StockQuantity == 0))
        product.StockQuantity = 50;

    //
    // Seed Default Coupon
    //
    if (!db.Coupons.Any(x => x.Code == "SUMMER10"))
    {
        db.Coupons.Add(new Coupon
        {
            Code = "SUMMER10",
            DiscountValue = 10,
            IsPercentage = true,
            ExpiresAt = DateTime.UtcNow.AddMonths(6),
            IsActive = true,
            UsageLimit = HoneyCosmetics.Domain.Enums.CouponUsageLimit.Unlimited,
        });
    }

    //
    // Seed Site Settings (single-row, holds public social/contact links)
    //
    if (!db.SiteSettings.Any())
    {
        db.SiteSettings.Add(new SiteSettings
        {
            Id = 1,
            FreeShippingThreshold = 10000m,
            NotificationBannerEnabled = true,
            NotificationBannerText = "Besplatna dostava za porudžbinu preko 10.000 RSD • Popust na prvu porudžbinu 10% uz kod FIRSTORDER",
        });
    }
    else
    {
        var siteRow = db.SiteSettings.First(s => s.Id == 1);
        if (siteRow.FreeShippingThreshold <= 0)
        {
            siteRow.FreeShippingThreshold = 10000m;
            db.SaveChanges();
        }
    }

    if (!db.ProductTypes.Any())
    {
        var defaultTypes = new[]
        {
            "Gel Color Polish",
            "Baze",
            "Builder Gelovi",
            "Top Coat",
            "Nega Kože",
            "Alati za manikir"
        };

        foreach (var name in defaultTypes)
            db.ProductTypes.Add(new ProductType { Name = name });
    }

    // U Development: opcioni test nalozi iz appsettings (nakon prazne/resetovane baze).
    if (app.Environment.IsDevelopment())
    {
        foreach (var item in builder.Configuration.GetSection("DevSeed:Users").GetChildren())
        {
            var email = item["Email"]?.Trim().ToLowerInvariant();
            var password = item["Password"];
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                continue;

            if (db.Users.Any(x => x.Email == email))
                continue;

            var firstName = string.IsNullOrWhiteSpace(item["FirstName"])
                ? "Test"
                : item["FirstName"]!.Trim();

            var lastName = string.IsNullOrWhiteSpace(item["LastName"])
                ? "Korisnik"
                : item["LastName"]!.Trim();

            Enum.TryParse<UserRole>(item["Role"] ?? "User", true, out var role);
            role = role == UserRole.Admin ? UserRole.Admin : UserRole.User;

            var u = new User
            {
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                Role = role,
                Country = string.IsNullOrWhiteSpace(item["Country"]) ? "Srbija" : item["Country"]!.Trim()
            };

            u.PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(password);

            db.Users.Add(u);
        }
    }

    db.SaveChanges();
    await CustomerProfileService.BackfillAsync(db);
}

//
// Swagger
//
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//
// HTTPS
//
app.UseHttpsRedirection();

//
// CORS
//
app.UseCors("frontend");

//
// Static Images
//
var imagesPath =
    Path.Combine(
        app.Environment.ContentRootPath,
        "images");

Directory.CreateDirectory(imagesPath);

var provider = new FileExtensionContentTypeProvider();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider =
        new PhysicalFileProvider(imagesPath),

    RequestPath = "/images",

    ContentTypeProvider = provider,

    OnPrepareResponse = ctx =>
    {
        var origin = ctx.Context.Request.Headers.Origin.ToString();
        var allowedOrigins = new[]
        {
            "http://localhost:5173",
            "https://filipantonijevic.github.io",
        };
        if (!string.IsNullOrEmpty(origin)
            && allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
        }
        ctx.Context.Response.Headers.Append("Cross-Origin-Resource-Policy", "cross-origin");
    },
});

//
// Authentication & Authorization
//
app.UseAuthentication();
app.UseAuthorization();

//
// Controllers
//
app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var thumbs = scope.ServiceProvider.GetRequiredService<ImageThumbnailService>();
            await thumbs.BackfillMissingThumbnailsAsync();
        }
        catch (Exception ex)
        {
            var log = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("ImageThumbnails");
            log.LogWarning(ex, "Thumbnail backfill failed.");
        }
    });
});

app.Run();
