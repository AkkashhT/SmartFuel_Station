# SmartFuel Station (prototype)
Quick start: terminal 1 `cd backend && mvn spring-boot:run`; terminal 2 `cd frontend && npm install && npm run dev` → http://localhost:5173
Spring Boot 3 + H2 (file DB) with a single-page dashboard. Requires Java 17+ and Maven.
```
cd backend && mvn spring-boot:run     # then open http://localhost:8080
```
Implemented: fuels + price history, tanks, atomic sales (pessimistic lock, price-at-sale, ledger, threshold-crossing alerts), deliveries (capacity + unique note), inventory ledger, live dashboard.
Also: JWT (HS256, 8h) + BCrypt auth (`POST /api/v1/auth/login`; set `SMARTFUEL_JWT_SECRET`), backend RBAC (ADMIN, MANAGER, CASHIER, ATTENDANT, AUDITOR), audit log.
Demo users: admin / manager / cashier / attendant / auditor, password `Demo@123` (override with `SMARTFUEL_DEMO_PASSWORD` / `smartfuel.demo-password`). Demo only: replace before any real use.
Also: shifts (open/close, one open at a time, sales require an open shift, expected collection by payment mode, cash and stock variance with tolerance + mandatory remarks, closed shifts immutable), customers with credit limits, vehicles (unique registration, API only).
Also: stock adjustments (reason required, ledger + audit), sales report (date filter, by fuel/payment) with CSV download, printable receipts, JUnit/MockMvc tests (`mvn test`, written but not yet executed).
Also: React + Vite frontend in `frontend/` (login, charts, tank detail with ledger trend, sortable/paginated sales table, CSV, print-to-PDF), rule-based forecasting/reorder advice, anomaly flags, SIMULATED sensor readings, Postgres profile, Dockerfiles and `docker-compose.yml`.
Run React: `cd frontend && npm install && npm run dev` (proxy to :8080). Docker: copy `.env.example` to `.env`, then `docker compose up --build` (UI on :3000). All operations (sales, deliveries, prices, adjustments, shifts, customers, alerts) are in the React UI. Backend serves API only on :8080.
NOT implemented (remaining): customers/vehicle entities, shifts, reports, audit log, sensor simulation, tests, Docker.
Status: not compiled or tested yet (see chat notes).
