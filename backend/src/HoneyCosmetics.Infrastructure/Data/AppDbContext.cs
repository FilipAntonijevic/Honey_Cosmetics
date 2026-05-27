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
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<CouponUsage> CouponUsages => Set<CouponUsage>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<SiteSettings> SiteSettings => Set<SiteSettings>();
    public DbSet<HomeSlideshowSlide> HomeSlideshowSlides => Set<HomeSlideshowSlide>();
    public DbSet<SitePopup> SitePopups => Set<SitePopup>();
    public DbSet<StockReceipt> StockReceipts => Set<StockReceipt>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
    public DbSet<CustomerProfile> CustomerProfiles => Set<CustomerProfile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().Ignore(x => x.FullName);
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<PendingRegistration>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<PendingRegistration>().HasIndex(x => x.ConfirmationToken).IsUnique();
        modelBuilder.Entity<Coupon>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<CouponUsage>().HasIndex(x => new { x.CouponId, x.UserId });
        modelBuilder.Entity<Wishlist>().HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();
        modelBuilder.Entity<Cart>().HasIndex(x => new { x.UserId, x.ProductId }).IsUnique();

        modelBuilder.Entity<Order>()
            .HasOne(x => x.User)
            .WithMany(u => u.Orders)
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

        modelBuilder.Entity<ProductImage>()
            .HasOne(x => x.Product)
            .WithMany(p => p.AdditionalImages)
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Name)
            .IsUnique();

        modelBuilder.Entity<ProductImage>()
            .HasIndex(x => new { x.ProductId, x.SortOrder });

        modelBuilder.Entity<HomeSlideshowSlide>()
            .HasIndex(x => x.SortOrder);

        modelBuilder.Entity<SitePopup>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SitePopup>()
            .HasIndex(x => x.IsActive);

        modelBuilder.Entity<StockReceipt>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LedgerEntry>()
            .HasOne(x => x.Order)
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LedgerEntry>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LedgerEntry>()
            .HasOne(x => x.StockReceipt)
            .WithMany()
            .HasForeignKey(x => x.StockReceiptId);

        modelBuilder.Entity<LedgerEntry>()
            .HasIndex(x => x.OccurredAt);

        modelBuilder.Entity<CustomerProfile>()
            .HasIndex(x => x.Email)
            .IsUnique();

        modelBuilder.Entity<CustomerProfile>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
