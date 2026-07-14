using System.Text.Json;
using MediatR;

namespace OrderTracking.Application.Identity.UpdateUserSettings;

public sealed record UpdateUserSettingsCommand(JsonElement Settings) : IRequest;
