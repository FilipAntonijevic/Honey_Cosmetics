using System.Text;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

//
// Controllers & Swagger
//
builder.Services.AddControllers();
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

//
// Background Services
//
builder.Services.AddHostedService<OrderNotificationBackgroundService>();

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

var app = builder.Build();

app.Logger.LogInformation(
    "Linkovi u emailu (potvrda, reset lozinke): {FrontendUrl}",
    app.Configuration["FrontendUrl"] ?? "https://filipantonijevic.github.io/Honey_Cosmetics");

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
            FirstOrderOnly = false
        });
    }

    //
    // Seed Site Settings (single-row, holds public social/contact links)
    //
    if (!db.SiteSettings.Any())
    {
        db.SiteSettings.Add(new SiteSettings { Id = 1 });
    }

    if (!db.ProductTypes.Any())
    {
        var defaultTypes = new[]
        {
            "Gel Lak",
            "Baze",
            "Builder Gel",
            "Top Coat",
            "Nega Kože",
            "Ostali Proizvodi"
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

app.Run();
