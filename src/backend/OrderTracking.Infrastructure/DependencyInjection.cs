using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Minio;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.Identity;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.Persistence.Interceptors;
using OrderTracking.Infrastructure.Services;
using OrderTracking.Infrastructure.Storage;

namespace OrderTracking.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<TelegramSettings>(configuration.GetSection(TelegramSettings.SectionName));
        services.Configure<MinioSettings>(configuration.GetSection(MinioSettings.SectionName));

        var minio = configuration.GetSection(MinioSettings.SectionName).Get<MinioSettings>()
            ?? new MinioSettings();

        services.AddSingleton<IMinioClient>(_ =>
            new MinioClient()
                .WithEndpoint(minio.Endpoint)
                .WithCredentials(minio.AccessKey, minio.SecretKey)
                .WithSSL(minio.UseSsl)
                .Build());

        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
        services.AddScoped<AuditableEntityInterceptor>();
        services.AddScoped<SoftDeleteInterceptor>();

        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
        services.AddSingleton<ITelegramAuthValidator, TelegramAuthValidator>();
        services.AddSingleton<ITrackingCodeGenerator, NanoIdTrackingCodeGenerator>();
        services.AddSingleton<IQrCodeGenerator, QrCodeGeneratorService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddSingleton<IObjectStorage, MinioObjectStorage>();
        services.AddSingleton<IImageCompressor, ImageSharpCompressor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString);
            options.AddInterceptors(
                sp.GetRequiredService<AuditableEntityInterceptor>(),
                sp.GetRequiredService<SoftDeleteInterceptor>());
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        return services;
    }
}
