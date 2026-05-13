using HoneyCosmetics.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<CouponUsage> CouponUsages => Set<CouponUsage>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().Ignore(x => x.FullName);
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Coupon>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<CouponUsage>().HasIndex(x => new { x.CouponId, x.UserId }).IsUnique();
        modelBuilder.Entity<Wishlist>().HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();
        modelBuilder.Entity<Cart>().HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();

        modelBuilder.Entity<Order>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Order>()
            .HasMany(x => x.Items)
            .WithOne(x => x.Order)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Gel Lak" },
            new Category { Id = 2, Name = "Baze" },
            new Category { Id = 3, Name = "Builder Gel" },
            new Category { Id = 4, Name = "Top Coat" },
            new Category { Id = 5, Name = "Nega Kože" },
            new Category { Id = 6, Name = "Ostali Proizvodi" }
        );

        modelBuilder.Entity<Product>().HasData(
            new Product { Id = 1, Name = "Honey Nude Gel Lak", Description = "Kremasti nude ton za elegantan izgled.", Price = 1190, ImageUrl = "https://images.unsplash.com/photo-1631214540242-68fa5cb5a222?auto=format&fit=crop&w=600&q=80", CategoryId = 1, CreatedAt = DateTime.UtcNow.AddDays(-8) },
            new Product { Id = 2, Name = "Silk Builder Gel", Description = "Samonivelišući builder za profesionalni finish.", Price = 1690, ImageUrl = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80", CategoryId = 3, CreatedAt = DateTime.UtcNow.AddDays(-6) },
            new Product { Id = 3, Name = "Gloss Top Coat", Description = "Dugotrajan sjaj bez lepljivog sloja.", Price = 990, ImageUrl = "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80", CategoryId = 4, CreatedAt = DateTime.UtcNow.AddDays(-3) },
            new Product { Id = 4, Name = "Care Honey Serum", Description = "Nega kože sa vitaminima i medom.", Price = 1490, ImageUrl = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80", CategoryId = 5, CreatedAt = DateTime.UtcNow.AddDays(-1) }
        );
    }
}
