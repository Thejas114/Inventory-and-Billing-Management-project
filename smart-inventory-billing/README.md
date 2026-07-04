# Smart Inventory & Billing Management System

A full-stack inventory and billing system with JWT authentication, role-based
access control (Admin / Manager / Cashier), automated stock updates, PDF
invoice generation, and interactive sales analytics dashboards.

## Tech Stack

**Backend:** Node.js, Express, SQLite (better-sqlite3), JWT, bcryptjs, PDFKit
**Frontend:** React 18, Vite, Tailwind CSS, Recharts, Axios, React Router

SQLite is used so the whole project runs with **zero external database setup**
— the database is just a file created automatically on first run.

## Project Structure

```
smart-inventory-billing/
├── backend/
│   ├── db/               # SQLite schema + seed data
│   ├── middleware/       # JWT auth + role-based access control
│   ├── routes/           # auth, products, suppliers, customers,
│   │                       inventory, billing, analytics
│   ├── utils/            # PDF invoice generator
│   └── server.js
└── frontend/
    └── src/
        ├── pages/         # Login, Dashboard, Products, Suppliers,
        │                    Customers, Inventory, Billing, Users
        ├── components/    # Layout, ProtectedRoute
        └── context/       # AuthContext (JWT session handling)
```

## Getting Started

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

The API runs at `http://localhost:5000`. On first run it automatically
creates `db/inventory.sqlite` and seeds it with demo users, suppliers,
products, and customers.

### 2. Frontend

In a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app runs at `http://localhost:5173` and talks to the API at the URL set
in `frontend/.env` (`VITE_API_URL`).

### 3. Log in

Use one of the seeded demo accounts (also shown as clickable buttons on the
login screen):

| Role     | Email                 | Password    |
|----------|------------------------|-------------|
| Admin    | admin@example.com     | admin123    |
| Manager  | manager@example.com   | manager123  |
| Cashier  | cashier@example.com   | cashier123  |

## Role Permissions

| Feature                        | Admin | Manager | Cashier |
|---------------------------------|:---:|:---:|:---:|
| View dashboard & analytics       | ✅ | ✅ | ✅ |
| Create invoices / billing        | ✅ | ✅ | ✅ |
| View products                    | ✅ | ✅ | ✅ |
| Add / edit products              | ✅ | ✅ | ❌ |
| Delete products                  | ✅ | ❌ | ❌ |
| Manage inventory (stock adjust)  | ✅ | ✅ | ❌ |
| Manage suppliers                 | ✅ | ✅ | ❌ |
| Manage customers                 | ✅ | ✅ | View/Add only |
| Void invoices                    | ✅ | ❌ | ❌ |
| Manage user accounts             | ✅ | ❌ | ❌ |

Roles are enforced **both** in the UI (nav items/buttons hidden) and on the
backend (every route double-checks the JWT role), so the API itself can't be
called directly to bypass restrictions.

## Key Features

- **JWT authentication** — stateless tokens signed with a server secret,
  8-hour expiry by default (`JWT_EXPIRES_IN` in `.env`).
- **Automated stock updates** — creating an invoice atomically deducts stock
  for every line item inside a database transaction; voiding an invoice
  restores it. Manual stock-in/out adjustments are logged in `stock_logs`
  with the reason and the user who made the change.
- **PDF invoice generation** — `GET /api/billing/:id/pdf` streams a
  professionally formatted invoice built with PDFKit.
- **Sales analytics** — revenue totals, 14-day sales trend, top-selling
  products, and revenue-by-category, all rendered with Recharts on the
  dashboard.
- **Low stock alerts** — the Inventory page flags any product at or below
  its reorder level.

## API Overview

All endpoints are prefixed with `/api` and (except `/auth/login`) require an
`Authorization: Bearer <token>` header.

- `POST /auth/login`, `GET /auth/me`, `POST /auth/register` (admin), `GET /auth/users` (admin)
- `GET/POST/PUT/DELETE /products`
- `GET/POST/PUT/DELETE /suppliers`
- `GET/POST/PUT/DELETE /customers`
- `GET /inventory`, `GET /inventory/low-stock`, `POST /inventory/adjust`
- `GET/POST /billing`, `GET /billing/:id`, `GET /billing/:id/pdf`, `DELETE /billing/:id`
- `GET /analytics/summary`, `/analytics/sales-by-date`, `/analytics/top-products`, `/analytics/sales-by-category`

## Notes for Production Use

- Change `JWT_SECRET` in `backend/.env` to a long random value.
- SQLite is great for a single-server deployment; swap `better-sqlite3` for
  `pg` (Postgres) if you need multi-server scaling — the SQL is
  intentionally simple/portable.
- Add HTTPS termination (e.g. via a reverse proxy like Nginx) before
  exposing this publicly, since JWTs are bearer tokens.
