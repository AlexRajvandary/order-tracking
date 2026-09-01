FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/products/Products.Domain ./src/products/Products.Domain
COPY tools/ProductTranslationJobsWorker ./tools/ProductTranslationJobsWorker
WORKDIR /src/tools/ProductTranslationJobsWorker
RUN dotnet restore ProductTranslationJobsWorker.csproj
RUN dotnet publish ProductTranslationJobsWorker.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ProductTranslationJobsWorker.dll"]
