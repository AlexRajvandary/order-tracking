using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Infrastructure.Services;

public sealed class ResendTransactionalEmailSender : ITransactionalEmailSender
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _from;

    public ResendTransactionalEmailSender(HttpClient http, IConfiguration configuration)
    {
        _http = http;
        _http.BaseAddress = new Uri("https://api.resend.com/");
        _apiKey = configuration["RESEND_API_KEY"] ?? configuration["Email:ResendApiKey"] ?? string.Empty;
        var address = configuration["EMAIL_FROM_ADDRESS"] ?? configuration["Email:FromAddress"] ?? string.Empty;
        var name = configuration["EMAIL_FROM_NAME"] ?? configuration["Email:FromName"] ?? "The Get";
        _from = string.IsNullOrWhiteSpace(address) ? string.Empty : $"{name} <{address}>";
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && !string.IsNullOrWhiteSpace(_from);

    public async Task SendAsync(string to, string subject, string html, string text, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured) throw new InvalidOperationException("Transactional email is not configured.");

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
        {
            Content = JsonContent.Create(new { from = _from, to = new[] { to }, subject, html, text }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Email provider returned {(int)response.StatusCode}.");
        }
    }
}
