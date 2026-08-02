# Kemena Mixing API

Standalone Express + MySQL API for Mid-Side mixing subscriptions.
The Kemena frontend talks to this service via `VITE_API_BASE`.

## Local

```bash
cp .env.example .env
npm install
npm run db:up          # MySQL via Docker on :3306
npm run dev
```

API: http://localhost:3001/mixing/api/config

Full stack in Docker (API + MySQL):

```bash
docker compose up --build
```

In the Kemena repo `.env.local`:

```bash
VITE_API_BASE=http://localhost:3001/mixing/api
```

Default admin (from env): `admin@example.com` / `admin_change_me`

Tables are created on boot (`initDb`). Old SQLite files under `data/` are unused now.

## Env

| Name | Purpose |
|------|---------|
| `PORT` | Listen port (default `3001`) |
| `CORS_ORIGIN` | Comma-separated frontend origins |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | Real keys disable demo mode |
| `JWT_SECRET` | Session signing |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin user |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | MySQL connection |
| `DATABASE_URL` | Optional `mysql://...` URI (overrides the `MYSQL_*` vars) |

## Hostinger

1. Create a MySQL database in hPanel and note host / user / password / db name.
2. Push this repo and connect it as a Node app (or run the container image if you prefer).
3. Set env in the panel — especially the `MYSQL_*` vars (or `DATABASE_URL`). Never commit `.env`.
4. `npm install` then `npm start`. No native SQLite build tools needed anymore.
5. Set `CORS_ORIGIN` to your live Kemena frontend origin(s).
6. Point Kemena’s `VITE_API_BASE` at `https://your-api-host/mixing/api`.

If MySQL is only reachable from the VPS, use that private host — not `127.0.0.1` from your laptop.

Production cookies use `SameSite=None; Secure` so cross-origin login works.

## Routes

All under `/mixing/api/*` (signup, terms, Paystack, auth, mix requests, admin).
