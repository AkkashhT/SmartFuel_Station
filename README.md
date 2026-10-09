# ⛽ SmartFuel Station

A fuel-retail operations and inventory management system for a petrol station: record sales, track tank stock, manage shifts and credit customers, and get forecasts and reports from a colourful, responsive dashboard.

> **Status:** academic prototype. Demo credentials and simulated sensor data are built in, so don't use it in production without hardening (see [Production notes](#production-notes)).

## Features

| Area | What you get |
|---|---|
| **Sales** | 3-step sale flow (fuel → litres or ₹ amount → payment), price captured at time of sale, atomic stock deduction with pessimistic locking, printable receipts |
| **Tanks & inventory** | Live fill gauges, stock ledger and trend chart, status levels (Normal / Low / Critical / Empty), threshold-crossing alerts with acknowledgement |
| **Deliveries** | Capacity check and unique delivery-note number |
| **Pricing** | Fuel price updates with reason and full price history |
| **Stock adjustments** | Reason required, written to the ledger and audit log |
| **Shifts** | One open shift at a time (sales require it), expected collection by payment mode, cash and stock variance with mandatory remarks, closed shifts are immutable |
| **Customers** | Credit customers with credit limits for CREDIT sales |
| **Insights** | Rule-based sales forecast and reorder advice, anomaly flags, **simulated** sensor-vs-system comparison |
| **Reports** | Sales report by fuel and payment mode, sortable and paginated history, CSV download, print to PDF |
| **Security** | JWT (HS256, 8 h) + BCrypt, role-based access control, audit log |
| **UI/UX** | Sidebar on desktop, bottom tab bar on mobile, light and dark themes, toast notifications, quick-pick chips, live auto-refresh every 10 s |

## Tech stack

- **Backend:** Java 17, Spring Boot 3, Spring Security, JPA/Hibernate, H2 (default) or PostgreSQL
- **Frontend:** React 18, Vite 5, Recharts (plain CSS, no UI framework)
- **Deployment:** Docker Compose (PostgreSQL + backend + nginx-served frontend)

## Project structure

```
smartfuel-station/
├── backend/                 Spring Boot API (:8080)
│   └── src/main/java/com/smartfuel/
│       ├── Api.java         REST endpoints
│       ├── AuthApi.java     Login and current user
│       ├── SecurityConfig   JWT filter and RBAC rules
│       ├── Domain.java      JPA entities
│       └── Repos.java       Repositories
├── frontend/                React + Vite UI
│   └── src/
│       ├── App.jsx          App shell, navigation, data loading
│       ├── pages.jsx        Home, Sales, Tanks, Shifts, Insights, Audit
│       ├── ui.jsx           Shared components (cards, gauges, forms, toasts)
│       ├── Login.jsx        Sign-in screen
│       ├── api.js           Fetch helpers and formatters
│       └── styles.css       Theme, layout, responsive rules
├── docker-compose.yml
└── .env.example
```

## Getting started

### Option A: local development (H2 database, no setup)

**Requirements:** Java 17+, Maven, Node.js 18+

```bash
# Terminal 1: backend on http://localhost:8080
cd backend
mvn spring-boot:run

# Terminal 2: frontend on http://localhost:5173
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the backend. Data is stored in `backend/data/` and survives restarts.

### Option B: Docker Compose (PostgreSQL)

```bash
cp .env.example .env     # then edit DB_PASSWORD and JWT_SECRET
docker compose up --build
```

Open **http://localhost:3000**.

## Demo accounts

All demo users share the password `Demo@123`.

| Username | Role | Can do |
|---|---|---|
| `admin` | ADMIN | Everything, including the audit log |
| `manager` | MANAGER | Sales, deliveries, prices, adjustments, shifts, customers, reports |
| `cashier` | CASHIER | Sales, add customers |
| `attendant` | ATTENDANT | Sales |
| `auditor` | AUDITOR | Read-only: reports, insights, audit log |

Override the password with `SMARTFUEL_DEMO_PASSWORD` (or `smartfuel.demo-password`).

> **First sale?** A shift must be open. Sign in as `manager`, go to **Shifts**, open one, then sell.

## Configuration

| Variable | Used by | Purpose |
|---|---|---|
| `SMARTFUEL_JWT_SECRET` | backend | JWT signing key (32+ characters). A dev-only default is used if unset. |
| `SMARTFUEL_DEMO_PASSWORD` | backend | Password for the seeded demo users |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | backend (`postgres` profile) | PostgreSQL connection |
| `SPRING_PROFILES_ACTIVE=postgres` | backend | Switch from H2 to PostgreSQL |
| `DB_PASSWORD`, `JWT_SECRET` | `.env` for Docker Compose | Required by `docker-compose.yml` |

## API overview

Base path: `/api/v1`. All endpoints except login need `Authorization: Bearer <token>`.

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/auth/login` | public |
| GET | `/me`, `/dashboard`, `/insights`, `/customers`, `/shifts` | any signed-in user |
| POST | `/sales` | Admin, Manager, Cashier, Attendant |
| POST | `/deliveries`, `/fuels/{id}/price`, `/tanks/{id}/adjust`, `/alerts/{id}/ack` | Admin, Manager |
| POST | `/shifts/open`, `/shifts/{id}/close` | Admin, Manager |
| POST | `/customers`, `/vehicles` | Admin, Manager, Cashier |
| GET | `/reports/sales`, `/reports/sales/page`, `/reports/sales.csv` | Admin, Manager, Auditor |
| GET | `/audit` | Admin, Auditor |
| GET | `/tanks/{id}/ledger`, `/fuels/{id}/price-history` | any signed-in user |

## Testing

```bash
cd backend
mvn test
```

JUnit/MockMvc tests cover the core sale, delivery and shift rules.

## Production notes

- Set a strong `SMARTFUEL_JWT_SECRET` and database password, and change or remove the seeded demo users.
- Sensor readings are **simulated**; connect real tank-gauge hardware before relying on them.
- Serve behind HTTPS.

## Roadmap

- Vehicle management screens (API exists, UI pending)
- Date-range filters in the sales report UI
- Code-splitting to reduce the frontend bundle size
- Screenshots and demo GIF for this README

## License

Add a license of your choice (for example MIT) before sharing publicly.
