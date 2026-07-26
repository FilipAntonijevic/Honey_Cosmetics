# Honey Cosmetics

Full-stack premium beauty e-commerce starter for **Honey Cosmetics**.

## Stack
- Backend: ASP.NET Core Web API (.NET 9), EF Core, PostgreSQL, JWT + refresh tokens
- Frontend: React + Vite, React Router, Axios, Context API
- Database: PostgreSQL

## Key Features
- Luxury/minimal UI with global **COTERIE** font style and responsive layout
- Multi-level sticky header, hero banner, product grid, cart, wishlist
- Auth: register/login/logout, forgot/reset password, refresh token
- Orders: checkout (cash on delivery / bank transfer), order statuses workflow
- Coupons: welcome coupon, promo coupons, one usage per user via `CouponUsage`
- Admin endpoints: product CRUD, dashboard, order status updates
- Email notifications via SendGrid — see [docs/SENDGRID_PRODUCTION.md](docs/SENDGRID_PRODUCTION.md) for domain authentication on `honey-cosmetic.com`

## Project Structure
- `backend/src/HoneyCosmetics.Api` - API entry point and controllers
- `backend/src/HoneyCosmetics.Domain` - domain entities/enums
- `backend/src/HoneyCosmetics.Application` - DTOs and interfaces
- `backend/src/HoneyCosmetics.Infrastructure` - EF Core DbContext and services
- `frontend` - React app

## Local Run (full stack)

**Terminal 1 — baza:**
```bash
cd Honey_Cosmetics
docker compose up -d
```

**Terminal 2 — backend (API na http://localhost:5128):**
```bash
cd backend/src/HoneyCosmetics.Api
dotnet run
```

**Terminal 3 — frontend (sajt na http://localhost:5173):**
```bash
cd frontend
npm install
npm run dev
```

Otvori **http://localhost:5173** u browseru. Frontend šalje `/api` zahteve na backend preko Vite proxy-ja.

### Admin nalozi

Repozitorijum ne sadrži podrazumevane admin kredencijale. Nalozi se podešavaju
preko bezbedne konfiguracije ili environment varijabli (`Admin__Accounts__0__...`).

Primer lokalne konfiguracije (ne commitovati stvarne vrednosti):
```json
"Admin": {
  "Accounts": [
    { "Email": "admin@example.com", "Password": "<jaka-lokalna-lozinka>", "FirstName": "Ime", "LastName": "Prezime" }
  ]
}
```

Novi nalozi iz konfiguracije kreiraju se pri pokretanju. U produkciji je
obavezna lozinka od najmanje 12 karaktera; postojeći nalozi i lozinke se ne menjaju.

**Napomena:** GitHub Pages hostuje samo frontend. Za login na live sajtu treba API u oblaku + `VITE_API_URL` na GitHubu.

## Environment
- Backend template: `backend/src/HoneyCosmetics.Api/.env.example`
- Frontend template: `frontend/.env.example`
