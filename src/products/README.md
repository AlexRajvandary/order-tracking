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
# Rakuten Web Service

Поиск Rakuten выполняется только через Products API; ключи не попадают в браузер. Создайте приложение в Rakuten Developers и задайте:

```env
RAKUTEN_APPLICATION_ID=...
RAKUTEN_ACCESS_KEY=...
RAKUTEN_AFFILIATE_ID=... # необязательно
PRODUCTS_INTERNAL_API_KEY=... # общий длинный случайный секрет Products API и OrderTracking API
```

На VPS добавьте значения в `~/order-tracking/.env`, затем выполните `docker compose -f docker-compose.prod.yml up -d --force-recreate api products-api catalog`.

Альтернатива уже поддержана deploy workflow: создайте repository secrets `RAKUTEN_APPLICATION_ID`, `RAKUTEN_ACCESS_KEY`, необязательный `RAKUTEN_AFFILIATE_ID` и `PRODUCTS_INTERNAL_API_KEY`. При deploy непустые secrets безопасно обновят соответствующие строки VPS-файла `.env`; пустые значения существующие настройки не затирают. Не используйте префикс `NEXT_PUBLIC_`: Rakuten Access Key является backend-секретом. Для локальной разработки используйте `.env` (он исключён из Git) либо .NET user-secrets с ключами `Rakuten:ApplicationId` и `Rakuten:AccessKey`.

Интеграция использует живой поиск, не копирует каталог Rakuten и не загружает изображения Rakuten в MinIO. В корзине и заказе сохраняется snapshot товара; непосредственно перед checkout цена и доступность проверяются повторно.
