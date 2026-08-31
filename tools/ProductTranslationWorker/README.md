# Product Translation Worker

Консольный .NET 8 worker получает небольшие batch товаров без `NameRu`, переводит названия через LM Studio (OpenAI-compatible API) и сохраняет переводы обратно в Products API.

Настройте `appsettings.json`: `Backend.BaseUrl`, при необходимости `Backend.ApiKey`, размер batch и `LmStudio.Model`. LM Studio запускается с локальным сервером на `http://localhost:1234/v1`.

Запуск: `dotnet run -c Release`. Публикация для Windows: `dotnet publish -c Release -r win-x64 --self-contained true`.

Состояние и аналитика сохраняются атомарно в `run-stats.json`, ошибки пишутся стандартным .NET logger. Worker не хранит товары или переводы в базе и безопасно повторяет batch после перезапуска.

Для graceful shutdown нажмите `Q` или `Ctrl+C`. Уже сохранённые переводы не теряются. После следующего запуска worker снова запросит pending-товары (`NameRu` пустое) и продолжит с оставшегося места; отдельный checkpoint не нужен.
