using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

/// <summary>
/// Invalidates authentication tokens issued before token-at-rest hashing was enabled.
/// Column names are intentionally unchanged; their values now contain SHA-256 hashes.
/// </summary>
public partial class HashAuthenticationTokens : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE "Users"
            SET "RefreshToken" = NULL,
                "RefreshTokenExpiresAt" = NULL,
                "ResetToken" = NULL,
                "ResetTokenExpiresAt" = NULL;
            """);

        // Pending confirmation tokens were stored as plaintext. Deleting these
        // rows lets affected users safely register again and receive hashed tokens.
        migrationBuilder.Sql("""DELETE FROM "PendingRegistrations";""");

        migrationBuilder.RenameColumn(
            name: "RefreshToken",
            table: "Users",
            newName: "RefreshTokenHash");

        migrationBuilder.RenameColumn(
            name: "ResetToken",
            table: "Users",
            newName: "ResetTokenHash");

        migrationBuilder.RenameColumn(
            name: "ConfirmationToken",
            table: "PendingRegistrations",
            newName: "ConfirmationTokenHash");

        migrationBuilder.RenameIndex(
            name: "IX_PendingRegistrations_ConfirmationToken",
            table: "PendingRegistrations",
            newName: "IX_PendingRegistrations_ConfirmationTokenHash");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Invalidated secrets cannot and must not be reconstructed.
        migrationBuilder.RenameIndex(
            name: "IX_PendingRegistrations_ConfirmationTokenHash",
            table: "PendingRegistrations",
            newName: "IX_PendingRegistrations_ConfirmationToken");

        migrationBuilder.RenameColumn(
            name: "ConfirmationTokenHash",
            table: "PendingRegistrations",
            newName: "ConfirmationToken");

        migrationBuilder.RenameColumn(
            name: "ResetTokenHash",
            table: "Users",
            newName: "ResetToken");

        migrationBuilder.RenameColumn(
            name: "RefreshTokenHash",
            table: "Users",
            newName: "RefreshToken");
    }
}
