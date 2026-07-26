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

# Architecture

## Stage 0 (Current)

```mermaid
flowchart LR
    Admin[Administrator]
    Customer[Order Tracking User]

    subgraph ExistingSystem["Existing Order System"]
        ReactAdmin["React Admin UI<br/>and Tracking Page"]
        OrderApi["ASP.NET Core<br/>Order API"]
        OrderDb[("PostgreSQL<br/>Orders DB")]
        Minio[("MinIO")]

        ReactAdmin --> OrderApi
        OrderApi --> OrderDb
        OrderApi --> Minio
    end

    Admin --> ReactAdmin
    Customer --> ReactAdmin

    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef user fill:#f3e8ff,stroke:#9333ea,color:#111827

    class ReactAdmin frontend
    class OrderApi service
    class OrderDb,Minio database
    class Admin,Customer user
```

---

## Stage 1

```mermaid
flowchart LR
    Admin[Administrator]
    Customer[Storefront User]
    TrackingUser[Order Tracking User]

    subgraph ExistingSystem["Existing Order System"]
        ReactAdmin["React Admin UI<br/>and Tracking Page"]
        OrderApi["ASP.NET Core<br/>Order API"]
        OrderDb[("PostgreSQL<br/>Orders DB")]
        Minio[("MinIO")]

        ReactAdmin --> OrderApi
        OrderApi --> OrderDb
        OrderApi --> Minio
    end

    subgraph CatalogSystem["Product Catalog"]
        NextJs["Next.js Storefront<br/>SSR and SEO"]
        ProductApi["ASP.NET Core<br/>Product API"]
        ProductDb[("PostgreSQL<br/>Products DB")]

        NextJs --> ProductApi
        ProductApi --> ProductDb
    end

    Admin --> ReactAdmin
    TrackingUser --> ReactAdmin
    Customer --> NextJs

    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef user fill:#f3e8ff,stroke:#9333ea,color:#111827

    class ReactAdmin,NextJs frontend
    class OrderApi,ProductApi service
    class OrderDb,ProductDb,Minio database
    class Admin,Customer,TrackingUser user
```

---

## Stage 2

```mermaid
flowchart LR
    Admin[Administrator]
    Customer[Storefront User]
    TrackingUser[Order Tracking User]

    subgraph Backoffice["Existing Backoffice"]
        ReactAdmin["React Admin UI<br/>Orders and Products"]
        OrderApi["ASP.NET Core<br/>Order API"]
        OrderDb[("PostgreSQL<br/>Orders DB")]
        Minio[("MinIO")]

        ReactAdmin -->|Orders| OrderApi
        OrderApi --> OrderDb
        OrderApi --> Minio
    end

    subgraph CatalogSystem["Product Catalog"]
        NextJs["Next.js Storefront<br/>SSR and SEO"]
        ProductApi["ASP.NET Core<br/>Product API"]
        ProductDb[("PostgreSQL<br/>Products DB")]

        NextJs --> ProductApi
        ProductApi --> ProductDb
    end

    ReactAdmin -->|Products| ProductApi

    Admin --> ReactAdmin
    TrackingUser --> ReactAdmin
    Customer --> NextJs

    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef user fill:#f3e8ff,stroke:#9333ea,color:#111827

    class ReactAdmin,NextJs frontend
    class OrderApi,ProductApi service
    class OrderDb,ProductDb,Minio database
    class Admin,Customer,TrackingUser user
```

---

## Stage 3

```mermaid
flowchart LR
    Admin[Administrator]
    Customer[Storefront User]
    Marketplace[Marketplace]

    subgraph Backoffice["Backoffice"]
        ReactAdmin["React Admin UI"]
        OrderApi["Order API"]
        OrderDb[("Orders DB")]

        ReactAdmin --> OrderApi
        OrderApi --> OrderDb
    end

    subgraph CatalogSystem["Product Catalog"]
        NextJs["Next.js Storefront"]
        ProductApi["Product API<br/>Validation and Upsert"]
        ProductDb[("Products DB")]

        NextJs --> ProductApi
        ProductApi --> ProductDb
    end

    subgraph ImportSystem["Import Service"]
        ImportApi["Import API"]
        Scheduler["Scheduler"]
        Parser["Parser Worker"]
        Normalizer["Product Normalizer"]

        ImportApi --> Scheduler
        Scheduler --> Parser
        Parser --> Normalizer
    end

    Admin --> ReactAdmin
    Customer --> NextJs

    ReactAdmin --> ProductApi
    ReactAdmin --> ImportApi

    Marketplace --> Parser
    Normalizer --> ProductApi

    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef worker fill:#fce7f3,stroke:#db2777,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef external fill:#f3e8ff,stroke:#9333ea,color:#111827

    class ReactAdmin,NextJs frontend
    class OrderApi,ProductApi,ImportApi service
    class Scheduler,Parser,Normalizer worker
    class OrderDb,ProductDb database
    class Admin,Customer,Marketplace external
```

---

## Stage 4

```mermaid
flowchart LR
    Admin[Administrator]
    Customer[Storefront User]
    Marketplace[Marketplace]

    subgraph Backoffice["Backoffice"]
        ReactAdmin["React Admin UI"]
        OrderApi["Order API"]
        OrderDb[("Orders DB")]

        ReactAdmin --> OrderApi
        OrderApi --> OrderDb
    end

    subgraph CatalogSystem["Product Catalog"]
        NextJs["Next.js Storefront"]
        ProductApi["Product API"]
        ProductDb[("Products DB")]

        NextJs --> ProductApi
        ProductApi --> ProductDb
    end

    subgraph ImportSystem["Import and AI Pipeline"]
        ImportApi["Import API"]
        Scheduler["Scheduler"]
        Parser["Parser Worker"]
        Normalizer["Product Normalizer"]
        AiEnrichment["AI Enrichment<br/>Translation and SEO"]
        Validator["Product Validator"]

        ImportApi --> Scheduler
        Scheduler --> Parser
        Parser --> Normalizer
        Normalizer --> AiEnrichment
        AiEnrichment --> Validator
    end

    Admin --> ReactAdmin
    Customer --> NextJs

    ReactAdmin --> ProductApi
    ReactAdmin --> ImportApi

    Marketplace --> Parser
    Validator --> ProductApi

    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef worker fill:#fce7f3,stroke:#db2777,color:#111827
    classDef ai fill:#ede9fe,stroke:#7c3aed,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef external fill:#f3e8ff,stroke:#9333ea,color:#111827

    class ReactAdmin,NextJs frontend
    class OrderApi,ProductApi,ImportApi service
    class Scheduler,Parser,Normalizer,Validator worker
    class AiEnrichment ai
    class OrderDb,ProductDb database
    class Admin,Customer,Marketplace external
```

---

## Stage 5

```mermaid
flowchart TB
    Admin[Administrator]
    Customer[Storefront User]
    TrackingUser[Order Tracking User]
    Marketplace[Marketplace]

    Proxy["Nginx or YARP<br/>Reverse Proxy"]

    Admin --> Proxy
    Customer --> Proxy
    TrackingUser --> Proxy

    Proxy -->|/admin| ReactAdmin["React Admin UI"]
    Proxy -->|/track| TrackingPage["Order Tracking Page"]
    Proxy -->|/| NextJs["Next.js Storefront"]
    Proxy -->|/api/orders| OrderApi["Order API"]
    Proxy -->|/api/products| ProductApi["Product API"]
    Proxy -->|/api/imports| ImportApi["Import API"]

    ReactAdmin --> OrderApi
    ReactAdmin --> ProductApi
    ReactAdmin --> ImportApi

    TrackingPage --> OrderApi
    NextJs --> ProductApi

    OrderApi --> OrderDb[("Orders DB")]
    ProductApi --> ProductDb[("Products DB")]

    ImportApi --> Scheduler["Scheduler"]
    Scheduler --> Parser["Parser Worker"]
    Marketplace --> Parser
    Parser --> AiEnrichment["AI Enrichment"]
    AiEnrichment --> Validator["Product Validator"]
    Validator --> ProductApi

    classDef gateway fill:#fee2e2,stroke:#dc2626,color:#111827
    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef worker fill:#fce7f3,stroke:#db2777,color:#111827
    classDef ai fill:#ede9fe,stroke:#7c3aed,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef external fill:#f3e8ff,stroke:#9333ea,color:#111827

    class Proxy gateway
    class ReactAdmin,TrackingPage,NextJs frontend
    class OrderApi,ProductApi,ImportApi service
    class Scheduler,Parser,Validator worker
    class AiEnrichment ai
    class OrderDb,ProductDb database
    class Admin,Customer,TrackingUser,Marketplace external
```

---

## Stage 6

```mermaid
flowchart LR
    Admin[Administrator]
    ReactAdmin["React Admin UI"]
    ImportApi["Import API and Scheduler"]

    Admin --> ReactAdmin
    ReactAdmin --> ImportApi

    ImportApi --> ImportQueue[("Import Jobs Queue")]

    ImportQueue --> RakutenParser["Rakuten Parser"]
    ImportQueue --> AmazonParser["Amazon Parser"]
    ImportQueue --> YahooParser["Yahoo Parser"]
    ImportQueue --> OtherParser["Other Parser"]

    RakutenParser --> RawQueue[("Raw Products Queue")]
    AmazonParser --> RawQueue
    YahooParser --> RawQueue
    OtherParser --> RawQueue

    RawQueue --> AiWorker1["AI Worker 1"]
    RawQueue --> AiWorker2["AI Worker 2"]
    RawQueue --> AiWorkerN["AI Worker N"]

    AiWorker1 --> EnrichedQueue[("Enriched Products Queue")]
    AiWorker2 --> EnrichedQueue
    AiWorkerN --> EnrichedQueue

    EnrichedQueue --> CatalogConsumer["Catalog Consumer"]
    CatalogConsumer --> ProductApi["Product API"]
    ProductApi --> ProductDb[("Products DB")]

    NextJs["Next.js Storefront"] --> ProductApi
    ReactAdmin --> ProductApi

    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef worker fill:#fce7f3,stroke:#db2777,color:#111827
    classDef ai fill:#ede9fe,stroke:#7c3aed,color:#111827
    classDef queue fill:#ffedd5,stroke:#ea580c,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef external fill:#f3e8ff,stroke:#9333ea,color:#111827

    class ReactAdmin,NextJs frontend
    class ImportApi,ProductApi service
    class RakutenParser,AmazonParser,YahooParser,OtherParser,CatalogConsumer worker
    class AiWorker1,AiWorker2,AiWorkerN ai
    class ImportQueue,RawQueue,EnrichedQueue queue
    class ProductDb database
    class Admin external
```

---

## Stage 7

```mermaid
flowchart TB
    Admin[Administrator]
    Customer[Storefront User]
    TrackingUser[Order Tracking User]

    Gateway["API Gateway<br/>YARP"]

    Admin --> Gateway
    Customer --> Gateway
    TrackingUser --> Gateway

    Gateway --> NextJs["Next.js Storefront"]
    Gateway --> ReactAdmin["React Backoffice"]
    Gateway --> BackofficeBff["Backoffice BFF"]
    Gateway --> PublicTrackingApi["Public Tracking API"]

    ReactAdmin --> BackofficeBff
    NextJs --> ProductApi["Product Service"]
    PublicTrackingApi --> OrderApi["Order Service"]

    BackofficeBff --> OrderApi
    BackofficeBff --> ProductApi
    BackofficeBff --> ImportApi["Import Service"]

    OrderApi --> OrderDb[("Orders DB")]
    ProductApi --> ProductDb[("Products DB")]
    ImportApi --> ImportDb[("Import DB")]

    ImportApi --> ImportQueue[("Import Jobs Queue")]

    ImportQueue --> ParserWorkers["Parser Workers"]
    ParserWorkers --> RawQueue[("Raw Products Queue")]

    RawQueue --> AiWorkers["AI Workers"]
    AiWorkers --> EnrichedQueue[("Enriched Products Queue")]

    EnrichedQueue --> CatalogConsumer["Catalog Consumer"]
    CatalogConsumer --> ProductApi

    ProductApi --> ProductStorage[("MinIO or S3")]
    ProductApi --> Redis[("Redis Cache")]

    classDef gateway fill:#fee2e2,stroke:#dc2626,color:#111827
    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef bff fill:#cffafe,stroke:#0891b2,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef worker fill:#fce7f3,stroke:#db2777,color:#111827
    classDef ai fill:#ede9fe,stroke:#7c3aed,color:#111827
    classDef queue fill:#ffedd5,stroke:#ea580c,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef external fill:#f3e8ff,stroke:#9333ea,color:#111827

    class Gateway gateway
    class NextJs,ReactAdmin frontend
    class BackofficeBff bff
    class PublicTrackingApi,OrderApi,ProductApi,ImportApi service
    class ParserWorkers,CatalogConsumer worker
    class AiWorkers ai
    class ImportQueue,RawQueue,EnrichedQueue queue
    class OrderDb,ProductDb,ImportDb,ProductStorage,Redis database
    class Admin,Customer,TrackingUser external
```

---

## Final Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        Admin[Administrator]
        Customer[Storefront User]
        TrackingUser[Order Tracking User]
    end

    subgraph Edge["Edge Layer"]
        Gateway["API Gateway<br/>YARP or Nginx"]
    end

    subgraph Frontends["Frontend Layer"]
        ReactAdmin["React Backoffice"]
        NextJs["Next.js Storefront"]
        TrackingPage["Order Tracking Page"]
    end

    subgraph ApiLayer["API and BFF Layer"]
        BackofficeBff["Backoffice BFF"]
        PublicTrackingApi["Public Tracking API"]
        OrderApi["Order Service"]
        ProductApi["Product Service"]
        ImportApi["Import Service"]
    end

    subgraph Processing["Asynchronous Processing"]
        ImportQueue[("Import Jobs Queue")]
        ParserWorkers["Parser Workers"]
        RawQueue[("Raw Products Queue")]
        AiWorkers["AI Enrichment Workers"]
        EnrichedQueue[("Enriched Products Queue")]
        CatalogConsumer["Catalog Consumer"]
    end

    subgraph Data["Data and Infrastructure"]
        OrderDb[("PostgreSQL<br/>Orders DB")]
        ProductDb[("PostgreSQL<br/>Products DB")]
        ImportDb[("PostgreSQL<br/>Import DB")]
        ProductStorage[("MinIO or S3")]
        Redis[("Redis")]
    end

    Admin --> Gateway
    Customer --> Gateway
    TrackingUser --> Gateway

    Gateway --> ReactAdmin
    Gateway --> NextJs
    Gateway --> TrackingPage
    Gateway --> BackofficeBff
    Gateway --> PublicTrackingApi

    ReactAdmin --> BackofficeBff
    NextJs --> ProductApi
    TrackingPage --> PublicTrackingApi

    PublicTrackingApi --> OrderApi

    BackofficeBff --> OrderApi
    BackofficeBff --> ProductApi
    BackofficeBff --> ImportApi

    OrderApi --> OrderDb
    ProductApi --> ProductDb
    ProductApi --> ProductStorage
    ProductApi --> Redis
    ImportApi --> ImportDb

    ImportApi --> ImportQueue
    ImportQueue --> ParserWorkers
    ParserWorkers --> RawQueue
    RawQueue --> AiWorkers
    AiWorkers --> EnrichedQueue
    EnrichedQueue --> CatalogConsumer
    CatalogConsumer --> ProductApi

    classDef gateway fill:#fee2e2,stroke:#dc2626,color:#111827
    classDef frontend fill:#dbeafe,stroke:#2563eb,color:#111827
    classDef bff fill:#cffafe,stroke:#0891b2,color:#111827
    classDef service fill:#dcfce7,stroke:#16a34a,color:#111827
    classDef worker fill:#fce7f3,stroke:#db2777,color:#111827
    classDef ai fill:#ede9fe,stroke:#7c3aed,color:#111827
    classDef queue fill:#ffedd5,stroke:#ea580c,color:#111827
    classDef database fill:#fef3c7,stroke:#d97706,color:#111827
    classDef external fill:#f3e8ff,stroke:#9333ea,color:#111827

    class Gateway gateway
    class ReactAdmin,NextJs,TrackingPage frontend
    class BackofficeBff bff
    class PublicTrackingApi,OrderApi,ProductApi,ImportApi service
    class ParserWorkers,CatalogConsumer worker
    class AiWorkers ai
    class ImportQueue,RawQueue,EnrichedQueue queue
    class OrderDb,ProductDb,ImportDb,ProductStorage,Redis database
    class Admin,Customer,TrackingUser external
```


## Environment variables

See [.env.example](.env.example).

## License

Private / internal use.
