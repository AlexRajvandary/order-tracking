using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace OrderTracking.Api.Auth;

public static class AuthCookieHelper
{
    public const string RefreshTokenCookieName = "refresh_token";

    public static void SetRefreshTokenCookie(
        HttpResponse response,
        IHostEnvironment environment,
        string refreshToken,
        DateTimeOffset expiresAt)
    {
        response.Cookies.Append(RefreshTokenCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.Strict,
            Path = "/api/v1/auth",
            Expires = expiresAt,
        });
    }

    public static void ClearRefreshTokenCookie(HttpResponse response, IHostEnvironment environment)
    {
        response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.Strict,
            Path = "/api/v1/auth",
        });
    }

    public static string? GetRefreshTokenFromRequest(HttpRequest request) =>
        request.Cookies[RefreshTokenCookieName];
}
