using System.Net;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using OrderTracking.Domain.Common;

namespace OrderTracking.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, detail) = exception switch
        {
            ValidationException validationException => (
                HttpStatusCode.BadRequest,
                "Validation failed",
                string.Join("; ", validationException.Errors.Select(e => e.ErrorMessage))),
            DomainException domainException => (
                HttpStatusCode.BadRequest,
                "Domain error",
                domainException.Message),
            KeyNotFoundException => (
                HttpStatusCode.NotFound,
                "Not found",
                exception.Message),
            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                "Unauthorized",
                exception.Message),
            ForbiddenException => (
                HttpStatusCode.Forbidden,
                "Forbidden",
                exception.Message),
            InvalidOperationException => (
                HttpStatusCode.Conflict,
                "Conflict",
                exception.Message),
            AiServiceException => (
                HttpStatusCode.BadGateway,
                "AI service error",
                exception.Message),
            _ => (
                HttpStatusCode.InternalServerError,
                "Internal server error",
                _environment.IsDevelopment() ? exception.Message : "An unexpected error occurred.")
        };

        if ((int)statusCode >= 500)
        {
            _logger.LogError(exception, "Unhandled exception");
        }
        else
        {
            _logger.LogWarning(exception, "Handled exception: {Title}", title);
        }

        var problem = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem, JsonOptions));
    }
}
