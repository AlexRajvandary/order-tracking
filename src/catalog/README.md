# The Get — каталог (Next.js)

Публичная витрина товаров. Пока данные **в памяти** (`src/lib/products.ts`), без API и БД.

## Запуск

```powershell
cd src/catalog
npm install
npm run dev
```

Открыть: [http://localhost:3001](http://localhost:3001)

## Страницы

| URL | Описание |
|-----|----------|
| `/` | Hero + сетка товаров (shadcn Card) |
| `/products/[slug]` | Страница товара + «В корзину» |
| `/cart` | Корзина (также sheet в шапке) |

Корзина хранится в `localStorage`. Кнопка оформления пока disabled.
