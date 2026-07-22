# Honey Cosmetics

Full-stack e-commerce app: ASP.NET Core (.NET 9) Web API + PostgreSQL backend, React + Vite frontend. See `README.md` for the product overview and the canonical run commands.

## Cursor Cloud specific instructions

### Services (local dev stack)
Three services make up the local stack. Standard commands live in `README.md` and `frontend/package.json`; only non-obvious details are noted here.

| Service | Location | Dev command | URL |
|---|---|---|---|
| PostgreSQL 16 | native install (not Docker) | started via `pg_ctlcluster 16 main start` | localhost:5432 |
| Backend API | `backend/src/HoneyCosmetics.Api` | `dotnet run` | http://localhost:5128 (Swagger at `/swagger`) |
| Frontend (Vite) | `frontend` | `npm run dev` | http://localhost:5173 (proxies `/api` + `/images` → :5128) |

- `.NET` is installed at `/usr/local/dotnet` and symlinked to `/usr/local/bin/dotnet` (already on PATH). `dotnet --version` → 9.0.x.
- PostgreSQL runs natively (no Docker in this environment). The DB `honey_cosmetics` with user/pass `postgres`/`postgres` matches the connection string in `appsettings.json`. Start it with `sudo pg_ctlcluster 16 main start` if it is not already running. The repo's `docker-compose.yml` (Postgres) is NOT used here.
- The backend applies EF Core migrations and seeds admins/coupon/site-settings/product-types automatically on startup (`Program.cs`), so **PostgreSQL must be running before `dotnet run`**.
- Run the API with `MakeWebhook__WebhookUrl=""` in dev to disable the Make.com order webhook (a real third-party URL is hard-coded in `appsettings.json`); otherwise placing an order POSTs to an external endpoint.
- Email (Brevo) is disabled when `Brevo:ApiKey` is unset/`CHANGE_ME`. In Development this makes registration a no-op-email flow: `POST /api/auth/register` returns a `devLink` you use to confirm the account (no real email needed). Order-confirmation email failures are caught and do not block checkout.
- Seeded admin logins come from `appsettings.json` `Admin:Accounts` (e.g. `jovanpopovic1552@gmail.com` / `honeyhoney45`). The catalog seeds product **types** only — there are no products until an admin creates them (via `POST /api/admin/products`, then `stock-purchase` + `stock-receipts/{id}/arrival` to make stock sellable).

### Known pre-existing issue (NOT caused by setup)
- Migration `backend/src/HoneyCosmetics.Infrastructure/Migrations/20260702120000_AddSiteEmailCategories.cs` is missing its `[DbContext(typeof(AppDbContext))]` and `[Migration("20260702120000_AddSiteEmailCategories")]` attributes (compare `20260630120000_AddCategorySortOrder.cs`). EF Core therefore never applies it, but the model snapshot expects its columns, so on a **fresh** database the API crashes on startup seeding `SiteSettings` (`column "ContactEmail" ... does not exist`). Workaround applied to the local DB: added the 4 columns (`ContactEmail`, `InfoEmails`, `MarketingEmail`, `OfficeEmail`, all `text NOT NULL DEFAULT ''`) to `SiteSettings`. If the DB is recreated from scratch, re-apply those columns or fix the migration attributes.

### Tests / lint / build
- Backend: `dotnet build HoneyCosmetics.slnx` and `dotnet test HoneyCosmetics.slnx` (xUnit) from repo root. One test (`ProductCatalogSortOrderTests`) currently fails on `master` — pre-existing, unrelated to setup.
- Frontend: `npm run lint` (ESLint) and `npm run build` (Vite) from `frontend`. `npm run lint` currently reports pre-existing errors on `master`.
