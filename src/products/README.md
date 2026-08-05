# Products microservice

ASP.NET Core Clean Architecture service for catalog products.

## Run locally

```powershell
# from repo root
docker compose up products-postgres -d
cd src/products
dotnet run --project Products.Api
```

API: http://localhost:5281  
Health: http://localhost:5281/health

Or full container:

```powershell
docker compose up products-postgres products-api --build -d
```

## Auth

- `GET` — anonymous (catalog + admin)
- `POST` / `PUT` / `DELETE` / `GET .../audit` — JWT Bearer (same secret/issuer/audience as Order Tracking)

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/products` | no |
| GET | `/api/products/{id}` | no |
| GET | `/api/products/by-slug/{slug}` | no |
| POST | `/api/products` | JWT |
| PUT | `/api/products/{id}` | JWT |
| DELETE | `/api/products/{id}` | JWT (soft delete) |
| GET | `/api/products/{id}/audit` | JWT |
