using ProductTranslationJobsWorker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<TranslationJobsOptions>(builder.Configuration.GetSection("TranslationJobs"));
builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAI"));

builder.Services.AddHttpClient("translation-jobs", (services, client) =>
{
    var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<TranslationJobsOptions>>().Value;
    client.BaseAddress = new Uri(options.ApiUrl.TrimEnd('/') + "/");
});

builder.Services.AddHttpClient<OpenAiTranslationClient>((services, client) =>
{
    var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<OpenAiOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(Math.Max(10, options.TimeoutSeconds));
});

builder.Services.AddHttpClient<ProductsClient>((services, client) =>
{
    var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<TranslationJobsOptions>>().Value;
    client.BaseAddress = new Uri(options.ApiUrl.TrimEnd('/') + "/");
});

builder.Services.AddSingleton<TranslationJobApiClient>();
builder.Services.AddSingleton<TranslationJobProcessor>();
builder.Services.AddHostedService<TranslationWorker>();

await builder.Build().RunAsync();
