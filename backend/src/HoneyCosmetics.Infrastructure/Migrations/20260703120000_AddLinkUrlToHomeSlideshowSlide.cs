using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations
{
    public class AddLinkUrlToHomeSlideshowSlide : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LinkUrl",
                table: "HomeSlideshowSlides",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LinkUrl",
                table: "HomeSlideshowSlides");
        }
    }
}
