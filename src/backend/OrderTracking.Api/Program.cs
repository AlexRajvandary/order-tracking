using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using OrderTracking.Api.Extensions;
using OrderTracking.Api.Middleware;
using OrderTracking.Api.Realtime;
using OrderTracking.Application;
using OrderTracking.Application.Common.Realtime;
using OrderTracking.Infrastructure;
using OrderTracking.Infrastructure.Persistence;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting Order Tracking API");

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) =>
        configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .WriteTo.Console());

    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddAuthServices(builder.Configuration, builder.Environment);

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        });

    builder.Services.AddSignalR();
    builder.Services.AddSingleton<IPresenceRegistry, PresenceRegistry>();
    builder.Services.AddScoped<IRealtimeNotifier, SignalRRealtimeNotifier>();

    builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
    {
        options.MultipartBodyLengthLimit = 52_428_800;
    });

    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Limits.MaxRequestBodySize = 52_428_800;
    });

    builder.Services.AddOpenApi();

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Default", policy =>
        {
            var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                ?? ["http://localhost:5173"];

            policy.WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

    builder.Services.AddHealthChecks()
        .AddNpgSql(connectionString, name: "postgresql", tags: ["db", "ready"]);

    var app = builder.Build();

    await DatabaseInitializer.InitialiseAsync(app.Services);

    app.UseSerilogRequestLogging();
    app.UseMiddleware<CorrelationIdMiddleware>();
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseCors("Default");

    var enableHttpsRedirect = app.Configuration.GetValue("App:UseHttpsRedirect", false);
    if (enableHttpsRedirect)
    {
        app.UseHttpsRedirection();
    }

    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    app.UseDefaultFiles();
    app.UseStaticFiles();

    app.MapControllers();

    app.MapHub<AdminHub>("/hubs/admin");
    app.MapHub<TrackingHub>("/hubs/tracking");

    app.MapHealthChecks("/health", new HealthCheckOptions
    {
        ResponseWriter = HealthCheckResponseWriter.WriteResponse
    });

    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready"),
        ResponseWriter = HealthCheckResponseWriter.WriteResponse
    });

    app.MapHealthChecks("/health/live", new HealthCheckOptions
    {
        Predicate = _ => false,
        ResponseWriter = HealthCheckResponseWriter.WriteResponse
    });

    app.MapFallbackToFile("index.html");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
