using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace OrderTracking.Infrastructure.Identity;

public sealed record CustomerTelegramIdentity(long Id, string? Name, string? Username, string? PhotoUrl);

public sealed class CustomerTelegramOAuthClient(HttpClient http, IOptions<CustomerTelegramSettings> options)
{
    private static readonly SemaphoreSlim KeysLock = new(1, 1);
    private static IReadOnlyCollection<SecurityKey>? _signingKeys;
    private static DateTimeOffset _keysExpireAt;
    private readonly CustomerTelegramSettings _settings = options.Value;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_settings.LoginClientId)
        && !string.IsNullOrWhiteSpace(_settings.LoginClientSecret)
        && Uri.TryCreate(_settings.LoginRedirectUri, UriKind.Absolute, out _);

    public string CreateAuthorizationUrl(string state, string nonce, string codeChallenge)
    {
        if (!IsConfigured) throw new InvalidOperationException("Telegram Login is not configured.");
        var query = new Dictionary<string, string>
        {
            ["client_id"] = _settings.LoginClientId,
            ["redirect_uri"] = _settings.LoginRedirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid profile telegram:bot_access",
            ["state"] = state,
            ["nonce"] = nonce,
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256",
        };
        return "https://oauth.telegram.org/auth?" + string.Join("&", query.Select(pair =>
            $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
    }

    public async Task<CustomerTelegramIdentity> ExchangeAndValidateAsync(
        string code, string codeVerifier, string expectedNonce, CancellationToken cancellationToken)
    {
        if (!IsConfigured) throw new InvalidOperationException("Telegram Login is not configured.");
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth.telegram.org/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = _settings.LoginRedirectUri,
                ["client_id"] = _settings.LoginClientId,
                ["code_verifier"] = codeVerifier,
            }),
        };
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_settings.LoginClientId}:{_settings.LoginClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        using var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) throw new UnauthorizedAccessException("Telegram authorization code is invalid or expired.");
        using var tokenJson = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        var idToken = tokenJson.RootElement.TryGetProperty("id_token", out var tokenElement) ? tokenElement.GetString() : null;
        if (string.IsNullOrWhiteSpace(idToken)) throw new UnauthorizedAccessException("Telegram did not return an ID token.");

        var handler = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(idToken, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://oauth.telegram.org",
            ValidateAudience = true,
            ValidAudience = _settings.LoginClientId,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = await GetSigningKeysAsync(cancellationToken),
            ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
            ClockSkew = TimeSpan.FromMinutes(1),
        }, out _);

        if (!string.Equals(principal.FindFirstValue("nonce"), expectedNonce, StringComparison.Ordinal))
            throw new UnauthorizedAccessException("Telegram login nonce does not match.");

        var idRaw = principal.FindFirstValue("id") ?? principal.FindFirstValue("sub");
        if (!long.TryParse(idRaw, out var telegramId) || telegramId <= 0)
            throw new UnauthorizedAccessException("Telegram user ID is missing.");

        var name = principal.FindFirstValue("name");
        if (string.IsNullOrWhiteSpace(name)) name = principal.FindFirstValue("given_name");
        return new CustomerTelegramIdentity(telegramId, name, principal.FindFirstValue("preferred_username"), principal.FindFirstValue("picture"));
    }

    private async Task<IReadOnlyCollection<SecurityKey>> GetSigningKeysAsync(CancellationToken cancellationToken)
    {
        if (_signingKeys is { Count: > 0 } && _keysExpireAt > DateTimeOffset.UtcNow) return _signingKeys;
        await KeysLock.WaitAsync(cancellationToken);
        try
        {
            if (_signingKeys is { Count: > 0 } && _keysExpireAt > DateTimeOffset.UtcNow) return _signingKeys;
            var json = await http.GetStringAsync("https://oauth.telegram.org/.well-known/jwks.json", cancellationToken);
            _signingKeys = new JsonWebKeySet(json).GetSigningKeys().ToArray();
            _keysExpireAt = DateTimeOffset.UtcNow.AddHours(6);
            return _signingKeys;
        }
        finally
        {
            KeysLock.Release();
        }
    }
}
