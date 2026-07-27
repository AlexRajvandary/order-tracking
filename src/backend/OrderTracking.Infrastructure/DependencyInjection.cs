using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Minio;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Infrastructure.Identity;
using OrderTracking.Infrastructure.Monitoring;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.Persistence.Interceptors;
using OrderTracking.Infrastructure.Services;
using OrderTracking.Infrastructure.Storage;
using OrderTracking.Infrastructure.TelegramBot;

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
        services.Configure<MonitoringSettings>(configuration.GetSection(MonitoringSettings.SectionName));

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
        services.AddScoped<IStorageMetricsService, StorageMetricsService>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString);
            options.AddInterceptors(
                sp.GetRequiredService<AuditableEntityInterceptor>(),
                sp.GetRequiredService<SoftDeleteInterceptor>());
        });

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddSingleton<TelegramBot.TelegramWorkQueue>();
        services.AddSingleton<TelegramBot.TelegramAdminBotService>(sp =>
        {
            var token = configuration["Telegram:BotToken"];
            Telegram.Bot.ITelegramBotClient? client = string.IsNullOrWhiteSpace(token)
                ? null
                : new Telegram.Bot.TelegramBotClient(token);
            return new TelegramBot.TelegramAdminBotService(
                sp.GetRequiredService<IServiceScopeFactory>(),
                configuration,
                sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<TelegramSettings>>(),
                sp.GetRequiredService<TelegramBot.TelegramWorkQueue>(),
                sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<TelegramBot.TelegramAdminBotService>>(),
                client);
        });
        services.AddScoped<ITelegramAdminNotifier, TelegramBot.TelegramOutboxNotifier>();
        services.AddHostedService<TelegramBot.TelegramBotHostedService>();
        services.AddHostedService<TelegramBot.TelegramOutboxProcessorHostedService>();
        services.AddHostedService<TelegramBot.TelegramDailyOrdersCsvBackgroundService>();

        services.AddHostedService<Background.StatusPublishBackgroundService>();

        return services;
    }
}
