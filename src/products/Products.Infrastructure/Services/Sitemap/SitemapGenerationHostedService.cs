using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Products.Infrastructure.Services.Sitemap;

public sealed class SitemapRegenerationQueue
{
    private readonly Channel<string> _channel = Channel.CreateBounded<string>(new BoundedChannelOptions(1)
    {
        FullMode = BoundedChannelFullMode.Wait,
        SingleReader = true,
        SingleWriter = false,
    });
    private readonly SitemapGenerationService _generation;

    public SitemapRegenerationQueue(SitemapGenerationService generation) => _generation = generation;

    public bool TryQueue(string reason)
    {
        var status = _generation.GetStatus();
        if (status.IsGenerating || status.IsQueued) return false;
        var accepted = _channel.Writer.TryWrite(reason);
        if (accepted) _generation.SetQueued(true);
        return accepted;
    }

    internal ChannelReader<string> Reader => _channel.Reader;
}

internal sealed class SitemapGenerationHostedService : BackgroundService
{
    private readonly SitemapGenerationService _generation;
    private readonly SitemapRegenerationQueue _queue;
    private readonly SitemapOptions _options;
    private readonly ILogger<SitemapGenerationHostedService> _logger;

    public SitemapGenerationHostedService(
        SitemapGenerationService generation,
        SitemapRegenerationQueue queue,
        IOptions<SitemapOptions> options,
        ILogger<SitemapGenerationHostedService> logger)
    {
        _generation = generation;
        _queue = queue;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(_options.InitialDelaySeconds), stoppingToken);
            _queue.TryQueue("startup");

            var scheduler = RunSchedulerAsync(stoppingToken);
            await foreach (var reason in _queue.Reader.ReadAllAsync(stoppingToken))
                await _generation.TryRegenerateAsync(reason, stoppingToken);
            await scheduler;
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Sitemap background service stopped");
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Sitemap background service loop failed");
        }
    }

    private async Task RunSchedulerAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(_options.RegenerationIntervalMinutes));
        while (await timer.WaitForNextTickAsync(stoppingToken))
            _queue.TryQueue("scheduled");
    }
}
