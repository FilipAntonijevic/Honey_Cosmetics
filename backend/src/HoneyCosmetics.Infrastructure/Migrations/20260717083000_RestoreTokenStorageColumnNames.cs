using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

/// <summary>
/// Property names describe the hashed value, while existing physical column
/// names remain stable for backwards-compatible schema mapping.
/// </summary>
public partial class RestoreTokenStorageColumnNames : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
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

    protected override void Down(MigrationBuilder migrationBuilder)
    {
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
}
