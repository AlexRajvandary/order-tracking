using System.Text.Json;

namespace OrderTracking.Application.Common.Models;

public sealed record CurrentUserDto(
    Guid Id,
    string Login,
    string? DisplayName,
    string Role,
    JsonElement Settings,
    long? TelegramId,
    string? TelegramUsername,
    string? TelegramAvatarUrl);


public sealed record AuthTokensDto(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    CurrentUserDto User);

public sealed record AuthResultDto(
    AuthTokensDto Tokens,
    string RefreshToken);
