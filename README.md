# Honey Cosmetics

Full-stack premium beauty e-commerce starter for **Honey Cosmetics**.

## Stack
- Backend: ASP.NET Core Web API (.NET 8), EF Core, PostgreSQL, JWT + refresh tokens
- Frontend: React + Vite, React Router, Axios, Context API
- Database: PostgreSQL

## Key Features
- Luxury/minimal UI with global **COTERIE** font style and responsive layout
- Multi-level sticky header, hero banner, product grid, cart, wishlist
- Auth: register/login/logout, forgot/reset password, refresh token
- Orders: checkout (cash on delivery / bank transfer), order statuses workflow
- Coupons: welcome coupon, promo coupons, one usage per user via `CouponUsage`
- Admin endpoints: product CRUD, dashboard, order status updates
- Background order notification service and email logging service

## Project Structure
- `backend/src/HoneyCosmetics.Api` - API entry point and controllers
- `backend/src/HoneyCosmetics.Domain` - domain entities/enums
- `backend/src/HoneyCosmetics.Application` - DTOs and interfaces
- `backend/src/HoneyCosmetics.Infrastructure` - EF Core DbContext and services
- `frontend` - React app

## Local Run
1. Start PostgreSQL (or `docker compose up -d`).
2. Backend:
   ```bash
   cd backend/src/HoneyCosmetics.Api
   dotnet run
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Default seeded admin:
- Email: `admin@honeycosmetics.local`
- Password: value from `Admin:SeedPassword` config/environment variable

## Environment
- Backend template: `backend/src/HoneyCosmetics.Api/.env.example`
- Frontend template: `frontend/.env.example`
