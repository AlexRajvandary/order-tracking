using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Minio;
using OrderTracking.Application.Common.Interfaces;
using OrderTracking.Application.Common.Persistence;
using OrderTracking.Infrastructure.Identity;
using OrderTracking.Infrastructure.Monitoring;
using OrderTracking.Infrastructure.Persistence;
using OrderTracking.Infrastructure.Persistence.Interceptors;
using OrderTracking.Infrastructure.Persistence.Repositories;
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

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IAdminUserRepository, AdminUserRepository>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IStatusDefinitionRepository, StatusDefinitionRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<ITelegramOutboxRepository, TelegramOutboxRepository>();

        services.AddSingleton<TelegramBot.TelegramWorkQueue>();
        services.AddSingleton(sp =>
        {
            var token = configuration["Telegram:BotToken"];
            Telegram.Bot.ITelegramBotClient? client = string.IsNullOrWhiteSpace(token)
                ? null
                : new Telegram.Bot.TelegramBotClient(token);
            var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<TelegramSettings>>().Value;
            var enabled = client is not null && !string.IsNullOrWhiteSpace(settings.BotToken);
            return new TelegramBot.TelegramBotRuntime(
                client,
                enabled,
                sp.GetRequiredService<IServiceScopeFactory>());
        });
        services.AddSingleton<TelegramBot.Auth.TelegramBotAdminResolver>();
        services.AddSingleton<TelegramBot.Screens.TelegramBotMenuScreen>();
        services.AddSingleton<TelegramBot.Screens.TelegramBotOrdersScreen>();
        services.AddSingleton<TelegramBot.Screens.TelegramBotCustomersScreen>();
        services.AddSingleton<TelegramBot.Screens.TelegramBotAdminsScreen>();
        services.AddSingleton<TelegramBot.Screens.TelegramBotSettingsScreen>();
        services.AddSingleton<TelegramBot.Routing.TelegramBotUpdateRouter>();
        services.AddSingleton<TelegramBot.Notify.TelegramBotNotifier>();
        services.AddSingleton<TelegramBot.Reports.TelegramOrdersCsvService>();
        services.AddSingleton(sp => new TelegramBot.TelegramAdminBotService(
            sp.GetRequiredService<TelegramBot.TelegramBotRuntime>(),
            sp.GetRequiredService<TelegramBot.Routing.TelegramBotUpdateRouter>(),
            sp.GetRequiredService<TelegramBot.Notify.TelegramBotNotifier>(),
            sp.GetRequiredService<TelegramBot.Reports.TelegramOrdersCsvService>()));
        services.AddScoped<ITelegramAdminNotifier, TelegramBot.TelegramOutboxNotifier>();
        services.AddHostedService<TelegramBot.TelegramBotHostedService>();
        services.AddHostedService<TelegramBot.TelegramOutboxProcessorHostedService>();
        services.AddHostedService<TelegramBot.TelegramDailyOrdersCsvBackgroundService>();

        services.AddHostedService<Background.StatusPublishBackgroundService>();

        return services;
    }
}
