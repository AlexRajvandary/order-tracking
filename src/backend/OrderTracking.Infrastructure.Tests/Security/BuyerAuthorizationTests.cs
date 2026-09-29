using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Moq;
using OrderTracking.Api.Controllers;
using OrderTracking.Api.Extensions;
using OrderTracking.Application.Admins;
using OrderTracking.Domain.Common;
using OrderTracking.Domain.Enums;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Security;

public sealed class BuyerAuthorizationTests
{
    [Fact]
    public async Task Default_policy_excludes_buyer()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = new string('x', 32),
                ["Jwt:Issuer"] = "tests",
                ["Jwt:Audience"] = "tests",
            })
            .Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthServices(configuration, Mock.Of<IHostEnvironment>());
        await using var provider = services.BuildServiceProvider();

        var policyProvider = provider.GetRequiredService<IAuthorizationPolicyProvider>();
        var policy = await policyProvider.GetDefaultPolicyAsync();
        var roles = policy.Requirements
            .OfType<RolesAuthorizationRequirement>()
            .Single()
            .AllowedRoles;

        Assert.DoesNotContain("Buyer", roles);
        Assert.Equal(["Moderator", "Admin", "SuperAdmin"], roles);
    }

    [Fact]
    public void Procurement_controller_allows_buyer_but_conversion_does_not()
    {
        var controllerRoles = typeof(ProcurementsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single()
            .Roles!;
        var conversionRoles = typeof(ProcurementsController)
            .GetMethod(nameof(ProcurementsController.ConvertOrder))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single()
            .Roles!;

        Assert.Contains("Buyer", controllerRoles.Split(','));
        Assert.DoesNotContain("Buyer", conversionRoles.Split(','));
    }

    [Fact]
    public void Admin_can_create_buyer_but_buyer_cannot_create_users()
    {
        AdminPermissionGuard.EnsureCanCreate(AdminRole.Admin, AdminRole.Buyer);

        Assert.Throws<ForbiddenException>(() =>
            AdminPermissionGuard.EnsureCanCreate(AdminRole.Buyer, AdminRole.Moderator));
    }
}
