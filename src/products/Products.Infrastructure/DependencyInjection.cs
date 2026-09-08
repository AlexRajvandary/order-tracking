using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Products.Application.Common.Interfaces;
using Products.Application.ExternalProducts;
using Products.Infrastructure.Persistence;
using Products.Infrastructure.Persistence.Interceptors;
using Products.Infrastructure.Persistence.Repositories;
using Products.Infrastructure.Services;
using Products.Infrastructure.Rakuten;
using Minio;

namespace Products.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddMemoryCache(options =>
        {
            options.SizeLimit = 500_000;
        });
        services.AddScoped<SoftDeleteInterceptor>();
        services.AddScoped<AuditableEntityInterceptor>();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<ProductsDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString);
            options.AddInterceptors(
                sp.GetRequiredService<SoftDeleteInterceptor>(),
                sp.GetRequiredService<AuditableEntityInterceptor>());
        });

        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IBrandRepository, BrandRepository>();
        services.AddScoped<IShopRepository, ShopRepository>();
        services.AddScoped<IProductAuditWriter, ProductAuditWriter>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddHttpClient<IProductImageSizeReader, ProductImageSizeReader>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(8);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("OrderTracking-ImageSize/1.0");
        }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
        {
            AllowAutoRedirect = false,
        });
        services.Configure<ProductImageStorageSettings>(configuration.GetSection(ProductImageStorageSettings.SectionName));
        services.AddSingleton<IMinioClient>(sp =>
        {
            var settings = configuration.GetSection(ProductImageStorageSettings.SectionName).Get<ProductImageStorageSettings>()
                ?? new ProductImageStorageSettings();
            var builder = new MinioClient().WithEndpoint(settings.Endpoint)
                .WithCredentials(settings.AccessKey, settings.SecretKey);
            if (settings.UseSsl) builder = builder.WithSSL();
            return builder.Build();
        });
        services.AddHttpClient<ProductImageStorage>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("OrderTracking-ImageImport/1.0");
        }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        services.AddHostedService<ProductImageImportHostedService>();
        services.Configure<RakutenSettings>(configuration.GetSection(RakutenSettings.SectionName));
        services.AddHttpClient<IRakutenCatalogClient, RakutenCatalogClient>((sp, client) =>
        {
            var settings = configuration.GetSection(RakutenSettings.SectionName).Get<RakutenSettings>() ?? new RakutenSettings();
            client.BaseAddress = new Uri(settings.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(Math.Clamp(settings.TimeoutSeconds, 2, 30));
            client.DefaultRequestHeaders.UserAgent.ParseAdd("TheGet-Rakuten/1.0");
        });

        return services;
    }
}
