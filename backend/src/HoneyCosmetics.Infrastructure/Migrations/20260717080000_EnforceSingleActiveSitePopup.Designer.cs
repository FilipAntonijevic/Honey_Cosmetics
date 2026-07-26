using HoneyCosmetics.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HoneyCosmetics.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260717080000_EnforceSingleActiveSitePopup")]
partial class EnforceSingleActiveSitePopup
{
}
