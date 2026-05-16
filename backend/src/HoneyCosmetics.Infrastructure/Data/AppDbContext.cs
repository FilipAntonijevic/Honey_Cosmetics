using HoneyCosmetics.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HoneyCosmetics.Infrastructure.Data;


public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<PendingRegistration> PendingRegistrations => Set<PendingRegistration>();
    public DbSet<ProductType> ProductTypes => Set<ProductType>();
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
    public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().Ignore(x => x.FullName);
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<PendingRegistration>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<PendingRegistration>().HasIndex(x => x.ConfirmationToken).IsUnique();
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

        modelBuilder.Entity<OrderItem>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProductType>()
            .HasMany(pt => pt.Categories)
            .WithOne(c => c.ProductType)
            .HasForeignKey(c => c.ProductTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Category>()
            .HasMany(c => c.Products)
            .WithOne(p => p.Category)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ProductType>()
            .HasIndex(pt => pt.Name)
            .IsUnique();
    }
}
