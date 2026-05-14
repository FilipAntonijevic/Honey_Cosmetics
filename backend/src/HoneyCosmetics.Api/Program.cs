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
        policy
            .WithOrigins(
                builder.Configuration["FrontendUrl"]
                ?? "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
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
    // Seed Admin User
    //
    if (!db.Users.Any(x => x.Role == UserRole.Admin))
    {
        var adminEmail =
            builder.Configuration["Admin:SeedEmail"]
            ?? "filipdantonijevic@gmail.com";

        var adminPassword =
            builder.Configuration["Admin:SeedPassword"]
            ?? "sifra1";

        var admin = new User
        {
            Email =
                adminEmail
                    .Trim()
                    .ToLowerInvariant(),

            FirstName =
                builder.Configuration["Admin:SeedFirstName"]
                ?? "Filip",

            LastName =
                builder.Configuration["Admin:SeedLastName"]
                ?? "Antonijevic",

            Role = UserRole.Admin,

            PhoneNumber = "+38160000000",

            DefaultAddress =
                "Bulevar oslobođenja 1, Novi Sad"
        };

        admin.PasswordHash =
            BCrypt.Net.BCrypt.HashPassword(
                adminPassword);

        db.Users.Add(admin);
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

    ContentTypeProvider = provider
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
