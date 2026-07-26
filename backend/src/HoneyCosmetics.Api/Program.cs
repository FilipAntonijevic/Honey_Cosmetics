using System.Text;
using System.Threading.RateLimiting;
using System.Net;
using HoneyCosmetics.Api.Extensions;
using HoneyCosmetics.Application.Interfaces;
using HoneyCosmetics.Domain.Entities;
using HoneyCosmetics.Domain.Enums;
using HoneyCosmetics.Infrastructure.Configurations;
using HoneyCosmetics.Infrastructure.Data;
using HoneyCosmetics.Api.Services;
using HoneyCosmetics.Infrastructure.Services;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
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
builder.Services.Configure<BrevoSettings>(
    builder.Configuration.GetSection("Brevo"));
builder.Services.Configure<MakeWebhookSettings>(
    builder.Configuration.GetSection("MakeWebhook"));

//
// Services
//
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddHttpClient<IEmailService, EmailService>(client =>
    client.Timeout = TimeSpan.FromSeconds(10));
builder.Services.AddHttpClient<IMakeWebhookService, MakeWebhookService>(client =>
    client.Timeout = TimeSpan.FromSeconds(10));
builder.Services.AddSingleton<ImageStorage>();
builder.Services.AddSingleton<ImageThumbnailService>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string PartitionKey(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    options.AddPolicy("auth-login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            PartitionKey(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("auth-register", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            PartitionKey(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("auth-recovery", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            PartitionKey(context),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                SegmentsPerWindow = 3,
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("auth-confirm", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            PartitionKey(context),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
    options.AddPolicy("contact", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            PartitionKey(context),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
});

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
            "https://honey-cosmetic.com",
            "https://www.honey-cosmetic.com",
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

if (!builder.Environment.IsDevelopment()
    && (secret.Contains("CHANGE_THIS", StringComparison.OrdinalIgnoreCase)
        || secret.Length < 32))
{
    throw new InvalidOperationException(
        "Jwt:Secret mora biti jak i jedinstven u produkciji (min. 32 karaktera).");
}

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
// Verujemo samo lokalnom nginx-u (i eksplicitno podešenim proxy adresama).
// Ne prihvataj X-Forwarded-For od proizvoljnih klijenata jer bi time mogli
// zaobići IP rate limiting.
forwardedOptions.KnownNetworks.Clear();
forwardedOptions.KnownProxies.Clear();
forwardedOptions.KnownProxies.Add(IPAddress.Loopback);
forwardedOptions.KnownProxies.Add(IPAddress.IPv6Loopback);
foreach (var configuredProxy in builder.Configuration
             .GetSection("ForwardedHeaders:KnownProxies")
             .Get<string[]>() ?? [])
{
    if (IPAddress.TryParse(configuredProxy, out var address))
        forwardedOptions.KnownProxies.Add(address);
}
app.UseForwardedHeaders(forwardedOptions);

var configuredFrontendUrl = app.Configuration["FrontendUrl"];
app.Logger.LogInformation(
    "Linkovi u emailu (potvrda, reset lozinke): {FrontendUrl}",
    string.IsNullOrWhiteSpace(configuredFrontendUrl)
        ? "(auto-detekcija iz domena zahteva)"
        : configuredFrontendUrl);

app.LogBrevoProductionReadiness();
app.LogMakeWebhookProductionReadiness();

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
        if (!app.Environment.IsDevelopment() &&
            (password.Length < 12 ||
             password.Contains("CHANGE_THIS", StringComparison.OrdinalIgnoreCase)))
        {
            app.Logger.LogWarning(
                "Preskačem nebezbedan Admin:Accounts seed za {Email}. Postojeći nalog nije promenjen.",
                email);
            continue;
        }

        var firstName = string.IsNullOrWhiteSpace(item["FirstName"])
            ? "Admin"
            : item["FirstName"]!.Trim();
        var lastName = string.IsNullOrWhiteSpace(item["LastName"])
            ? "User"
            : item["LastName"]!.Trim();

        var user = db.Users.FirstOrDefault(x => x.Email == email);
        if (user is null)
        {
            db.Users.Add(new User
            {
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                Role = UserRole.Admin,
                Country = "Srbija",
                PhoneNumber = item["PhoneNumber"]?.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            });
        }
        // Postojeći nalog: ne diži Role na Admin i ne diraj lozinku
        // (sprečava takeover ako neko registruje isti email pre seed-a).
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
app.UseRouting();
app.UseCors("frontend");
app.UseRateLimiter();

//
// Static Images
// Prefer Images:RootPath / Images__RootPath so deploy publish dirs never own uploads.
//
var imagesPath = app.Services.GetRequiredService<ImageStorage>().RootPath;
app.Logger.LogInformation("Serving product images from {ImagesPath}", imagesPath);

Directory.CreateDirectory(imagesPath);

var provider = new FileExtensionContentTypeProvider();

app.UseWhen(
    context => context.Request.Path.StartsWithSegments("/images"),
    imagesApp => imagesApp.Use(async (context, next) =>
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; sandbox";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        await next();
    }));

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
        ctx.Context.Response.Headers["Cache-Control"] = "public,max-age=86400";
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
