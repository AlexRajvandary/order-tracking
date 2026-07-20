# Order Tracking System

Internal CRM for managing customer orders with public QR-based tracking.

## Tech stack

- **Backend:** ASP.NET Core (.NET 10), EF Core, PostgreSQL, MediatR, FluentValidation, CQRS
- **Frontend:** React, TypeScript, Vite, TailwindCSS, TanStack Query, react-i18next (RU/EN)
- **Deployment:** Docker Compose (single VPS)

## Project structure

```
order-tracking/
├── docker/                 # Dockerfiles
├── src/
│   ├── backend/            # .NET solution (OrderTracking.slnx)
│   └── frontend/           # React SPA → bundled into API wwwroot
├── docker-compose.yml
└── .env.example
```

## Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional, for full stack)

## Quick start (local development)

### 1. PostgreSQL

```powershell
docker compose up postgres -d
```

Default host port is **5433** (to avoid conflict with a local PostgreSQL on 5432).

### 2. Backend API

```powershell
cd src/backend
dotnet run --project OrderTracking.Api
```

API: `http://localhost:5280`  
Health: `http://localhost:5280/health`  
Ping: `http://localhost:5280/api/v1/ping`

### 3. Frontend (dev server)

```powershell
cd src/frontend
npm install
npm run dev
```

UI: `http://localhost:5173` (proxies `/api` → backend)

## Docker (full stack)

```powershell
cp .env.example .env
docker compose up --build
```

App: `http://localhost:8080`

## Auth tokens (planned)

| Token | TTL |
|-------|-----|
| Access JWT | 24 hours |
| Refresh token | 7 days (HttpOnly cookie, rotation) |

## Implementation phases

- [x] **Phase 0** — Scaffold, Docker, health checks, i18n shell
- [x] **Phase 1** — Domain entities, EF migrations, DB schema, seed statuses
- [x] **Phase 2** — Identity (JWT + refresh), seed admin
- [x] **Phase 3** — Customers CRUD
- [x] **Phase 4** — Orders Core (create, list, search, NanoId)
- [x] **Phase 5** — Order Items add/edit/delete
- [x] **Phase 6** — Status updates + history + status definitions
- [x] **Phase 7** — Public Tracking API
- [x] **Phase 8** — QR & tracking links polish
- [x] **Phase 9** — Audit log write + Correlation ID
- [x] **Phase 10** — Dashboard aggregates API + UI

## Environment variables

See [.env.example](.env.example).

## License

Private / internal use.
