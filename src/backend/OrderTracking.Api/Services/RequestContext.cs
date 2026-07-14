using Microsoft.AspNetCore.Http;
using OrderTracking.Application.Common.Interfaces;

namespace OrderTracking.Api.Services;

public sealed class RequestContext : IRequestContext
{
    public const string CorrelationItemKey = "CorrelationId";

    private readonly IHttpContextAccessor _httpContextAccessor;

    public RequestContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? CorrelationId
    {
        get
        {
            var context = _httpContextAccessor.HttpContext;
            if (context is null)
            {
                return null;
            }

            if (context.Items.TryGetValue(CorrelationItemKey, out var value) && value is string id)
            {
                return id;
            }

            return context.TraceIdentifier;
        }
    }

    public string? IpAddress =>
        _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public string? UserAgent =>
        _httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();
}
