# Сборщик каталога Maketto.jp

Локальная консольная утилита открывает каталог Maketto.jp в Chromium, переходит по страницам и сохраняет товары в JSON, совместимый с импортом Product API.

## Установка

```powershell
cd C:\Users\stark\Documents\order-tracking\tools\maketto-crawler
npm install
npm run install-browser
```

## Запуск

```powershell
.\run.ps1 -Url "https://maketto.jp/ru/catalog?store=rakuten&category=101070" -Pages 5
```

По умолчанию результат появится в `output/maketto-products.json`.

Свой путь к файлу:

```powershell
.\run.ps1 -Url "https://maketto.jp/ru/catalog?store=rakuten&category=101070" -Pages 10 -Output "C:\temp\watches.json"
```

Можно запускать и напрямую через Node.js:

```powershell
node .\src\index.mjs --url "https://maketto.jp/ru/catalog?store=rakuten&category=101070" --pages 5
```

Дополнительные параметры:

- `--delay 1200` — задержка между страницами в миллисекундах;
- `--timeout 60000` — время ожидания страницы или ответа сайта;
- `--headful` — показать окно браузера;
- `--category "Часы"` — принудительно назначить категорию всем товарам;
- `--parent-category "Аксессуары"` — дополнительно назначить родительскую категорию;
- `--help` — показать справку.

Количество в `--pages` означает число страниц, которые надо обработать, начиная с открытой по URL страницы. Утилита останавливается раньше, если следующей страницы нет.

Файл перезаписывается после каждой обработанной страницы. Повторяющиеся товары удаляются по SKU.
