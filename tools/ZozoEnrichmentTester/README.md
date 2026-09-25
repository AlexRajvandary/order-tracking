# ZozoEnrichmentTester

Локальная .NET 8 утилита, которая последовательно обогащает произвольные CSV-batch-файлы ZOZO и накапливает единый корпус в SQLite. Проект автономен: он не использует PostgreSQL, The Get backend и не запускает браузер самостоятельно.

## Хранилище и модель работы

Основное хранилище — `data/zozo-enrichment.db`. Путь задаётся параметром `Zozo:DatabasePath` в `appsettings.json`; директория создаётся автоматически, база никогда не удаляется и не сбрасывается при старте.

Каждый CSV сначала целиком регистрируется в БД. `product_id` — непрозрачный внешний ID и первичный ключ. Повторное появление ID обновляет `source_url` и `last_seen_at`, но не стирает готовые данные и статус. Одинаковые URL у разных ID не объединяются.

Статусы:

- `Pending` — новый товар;
- `Processing` — начата попытка; после сбоя этот статус снова доступен для обработки;
- `Completed` — успешно обработан и по умолчанию пропускается;
- `Failed` — обычная ошибка, повторяется только с `--retry-errors`;
- `Blocked` — распознана блокировка ZOZO/Akamai, повторяется только с `--retry-errors`.

Таблица `products` хранит identity, нормализованные поля товара, JSON-массивы, ZOZO IDs, статус, ошибку, даты и число попыток. `imports` хранит путь и SHA-256 входного файла, время, количество строк и статистику запуска. `import_products` связывает конкретный импорт с его ID товаров, поэтому обычный input-run никогда не подхватывает старый глобальный backlog. Есть `schema_info(version)` и индексы по статусу, URL и import ID.

SQLite открывается с `journal_mode=WAL`, `busy_timeout=5000`, `synchronous=NORMAL` и foreign keys. Во время browser navigation транзакция не удерживается; результат коммитится сразу после каждого товара. Browser-side BFF-запросы ограничены `Zozo:RequestTimeoutMs` (по умолчанию 60 секунд), поэтому зависший ответ сохраняется как ошибка и не останавливает весь batch.

## Edge и CDP

Сначала пользователь вручную запускает отдельный обычный Edge:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="C:\temp\zozo-edge-profile" `
  "https://zozo.jp/"
```

Нужно убедиться, что ZOZO открылся без `Access Denied`, и оставить Edge открытым. Программа подключается к `http://127.0.0.1:9222` через `Chromium.ConnectOverCDPAsync` и использует существующий context. Внутри него она создаёт собственные API/product-вкладки, восстанавливает их при случайном закрытии и при завершении закрывает только эти вкладки — внешний Edge, context и пользовательские вкладки не закрываются.

Перед batch выполняется короткая проверка известного BFF endpoint в браузерной сессии. Для товара одна переиспользуемая page делает `GotoAsync(..., DOMContentLoaded)`. Источники анализируются в порядке: `__NEXT_DATA__`, Product LD+JSON, другие embedded JSON, DOM/meta fallback. BFF вызывается только для недостающих visual/size данных. Обработка строго последовательная, задержка по умолчанию 2500 мс.

## Сборка и команды

```powershell
dotnet restore
dotnet build
```

Новый batch (обрабатываются только его ID):

```powershell
dotnet run --no-build -- --input .\input.csv --limit 100 --delay-ms 2500
```

Повтор Failed/Blocked только из текущего CSV:

```powershell
dotnet run --no-build -- --input .\input.csv --retry-errors
```

Принудительное обновление, включая Completed из текущего CSV:

```powershell
dotnet run --no-build -- --input .\input.csv --force
```

Продолжение глобальных Pending/Processing; Failed/Blocked включаются только с `--retry-errors`:

```powershell
dotnet run --no-build -- --resume --limit 100
dotnet run --no-build -- --resume --retry-errors --limit 100
```

Экспорт результата конкретного нового импорта либо всего корпуса:

```powershell
dotnet run --no-build -- --input .\input.csv --export .\exports\input-result.csv
dotnet run --no-build -- --export-all .\exports\all-products.csv
```

Генерация одного транзакционного PostgreSQL-скрипта для всех успешно разобранных товаров с UUID:

```powershell
dotnet run --no-build -- --generate-postgres-sql .\exports\zozo-import.sql
```

Строки с тестовыми идентификаторами вроде `test-1` автоматически пропускаются. Скрипт обновляет только уже
существующие товары, заменяет их галереи, цвета, размеры, варианты и видео и выводит число найденных и
отсутствующих в PostgreSQL товаров. Перед его выполнением должна быть применена миграция
`AddZozoProductDetails`. Файл можно выполнить целиком как через `psql`, так и через Query Tool в pgAdmin.
Рядом автоматически создаётся файл `*-links.txt` со ссылками на страницы импортируемых товаров на `the-get.ru`.

`--limit N` ограничивает фактически выбранные к парсингу товары, а не строки CSV. `--save-failed-html` сохраняет HTML только ошибок в `errors/html/{productId}.html`. `--cdp-endpoint` и `--delay-ms` переопределяют config. Первый Ctrl+C даёт текущему товару завершиться и сохраниться; второй отменяет операцию немедленно. Приложение не закрывает Edge.

Вход принимает заголовки `id,url` либо эквивалентные `product_id,source_url`:

```csv
id,url
test-1,https://zozo.jp/shop/doublename/goods-sale/102859695/?did=165302541
```

Экспорт записывается в UTF-8 BOM и содержит `id`, `source_url`, поля товара, JSON-поля, ZOZO IDs, `status` и `error`.

## Просмотр базы

Откройте `data/zozo-enrichment.db` в DB Browser for SQLite или через `sqlite3`:

```sql
SELECT parse_status, COUNT(*) FROM products GROUP BY parse_status;
SELECT COUNT(*) FROM products;
SELECT * FROM products WHERE parse_status = 'Failed' LIMIT 20;
SELECT import_id, input_file, input_file_hash, started_at, finished_at,
       total_rows, new_products, already_completed, processed, succeeded, failed, blocked
FROM imports ORDER BY import_id DESC;
```

Полный HTML по умолчанию в БД не хранится, изображения не скачиваются. Три последовательных `Blocked` останавливают запуск без агрессивных retry.
