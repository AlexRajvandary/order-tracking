# Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend
COPY src/frontend/package*.json ./
RUN npm ci
COPY src/frontend/ ./
RUN npm run build

# Build backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY src/backend/ ./backend/
WORKDIR /src/backend
RUN dotnet restore OrderTracking.sln
RUN dotnet publish OrderTracking.Api/OrderTracking.Api.csproj -c Release -o /app/publish --no-restore

# Copy frontend into wwwroot
COPY --from=frontend-build /src/frontend/dist /app/publish/wwwroot

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=backend-build /app/publish .
ENTRYPOINT ["dotnet", "OrderTracking.Api.dll"]
