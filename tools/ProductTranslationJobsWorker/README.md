# ProductTranslationJobsWorker

Отдельный worker для массового перевода названий товаров через OpenAI.

## Запуск локально

```powershell
$env:TranslationJobs__ApiUrl = "http://localhost:5281/api/translation-jobs"
$env:TranslationJobs__WorkerApiKey = "dev-crawler-key-change-me"
$env:OpenAI__ApiKey = "sk-..."
$env:OpenAI__Model = "gpt-5-mini"
dotnet run --project tools/ProductTranslationJobsWorker/ProductTranslationJobsWorker.csproj
```

Worker не изменяет базу товаров напрямую. Он получает снимок задания и исходные названия через Products API, отправляет батчи до 100 товаров в OpenAI и сохраняет переводы через внутренний bulk endpoint.

Состояние задания, элементов и батчей хранится в PostgreSQL Products API. После перезапуска незавершённые элементы/батчи старше десяти минут возвращаются в очередь. Пауза и отмена прекращают запуск новых запросов, а уже выполняющийся запрос завершается безопасно.

## Настройки

Основные параметры передаются через `TranslationJobs__*` и `OpenAI__*`. `TranslationJobs__MaxRetries` ограничивает повторы временных ошибок OpenAI (429, 5xx, timeout и сетевые ошибки), а `TranslationJobs__RetryBaseDelaySeconds` задаёт базовую экспоненциальную задержку с jitter.
