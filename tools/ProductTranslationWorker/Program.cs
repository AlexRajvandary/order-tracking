using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace ProductTranslationWorker;

public static class Program
{
    public static async Task Main(string[] args)
    {
        var provider = SelectProvider();
        var builder = Host.CreateApplicationBuilder(args);
        builder.Configuration.AddJsonFile("appsettings.json", false, true)
            .AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);
        builder.Services.Configure<BackendOptions>(builder.Configuration.GetSection("Backend"));
        builder.Services.Configure<LmStudioOptions>(builder.Configuration.GetSection("LmStudio"));
        builder.Services.Configure<WorkerOptions>(builder.Configuration.GetSection("Worker"));
        builder.Services.Configure<PricingOptions>(builder.Configuration.GetSection("Pricing"));
        builder.Services.AddSingleton<NetworkTrafficTracker>();
        builder.Services.AddTransient<VpsTrafficHandler>();
        builder.Services.AddHttpClient<BackendClient>((sp, c) =>
        {
            var o = sp.GetRequiredService<IOptions<BackendOptions>>().Value;
            c.BaseAddress = new Uri(o.BaseUrl.TrimEnd('/') + "/"); c.Timeout = TimeSpan.FromSeconds(o.RequestTimeoutSeconds);
            if (!string.IsNullOrWhiteSpace(o.ApiKey)) c.DefaultRequestHeaders.Authorization = new("Bearer", o.ApiKey);
        }).AddHttpMessageHandler<VpsTrafficHandler>();
        builder.Services.AddHttpClient<LmStudioClient>((sp, c) =>
        {
            var o = sp.GetRequiredService<IOptions<LmStudioOptions>>().Value;
            c.BaseAddress = new Uri(o.BaseUrl.TrimEnd('/') + "/"); c.Timeout = TimeSpan.FromSeconds(o.RequestTimeoutSeconds);
        });
        builder.Services.AddSingleton<ITranslationProvider>(sp => { if (provider == 1) return new LmStudioTranslationProvider(sp.GetRequiredService<LmStudioClient>()); var section = provider == 2 ? builder.Configuration.GetSection("OpenAI") : provider == 3 ? builder.Configuration.GetSection("Gemini") : builder.Configuration.GetSection("DeepSeek"); var o = section.Get<ProviderOptions>() ?? new(); var key = string.IsNullOrWhiteSpace(o.ApiKey) ? Environment.GetEnvironmentVariable(provider == 2 ? "OPENAI_API_KEY" : provider == 3 ? "GEMINI_API_KEY" : "DEEPSEEK_API_KEY") ?? "" : o.ApiKey; return new CloudTranslationProvider(new HttpClient { BaseAddress = new Uri(o.BaseUrl.TrimEnd('/') + "/") }, provider == 2 ? "OpenAI" : provider == 3 ? "Gemini" : "DeepSeek", o.Model, key); });
        builder.Services.AddHostedService<TranslationWorker>();
        using var stop = new CancellationTokenSource(); Console.CancelKeyPress += (_, e) => { e.Cancel = true; stop.Cancel(); };
        var host = builder.Build();
        _ = Task.Run(() => { while (!stop.IsCancellationRequested) { try { if (Console.KeyAvailable && Console.ReadKey(true).Key == ConsoleKey.Q) stop.Cancel(); } catch (InvalidOperationException) { } Thread.Sleep(100); } });
        try { await host.RunAsync(stop.Token); } catch (OperationCanceledException) { }
    }

    private static int SelectProvider()
    {
        Console.WriteLine("Translation Provider\n1. LM Studio / Qwen local\n2. OpenAI\n3. Gemini\n4. DeepSeek");
        while (true) { Console.Write("Select provider [1]: "); var value = Console.ReadLine(); if (string.IsNullOrWhiteSpace(value)) return 1; if (int.TryParse(value, out var n) && n is >= 1 and <= 4) return n; Console.WriteLine("Введите число от 1 до 4."); }
    }
}
