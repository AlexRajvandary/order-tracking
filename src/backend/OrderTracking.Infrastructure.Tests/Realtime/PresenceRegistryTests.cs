using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OrderTracking.Api.Realtime;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Realtime;

public class PresenceRegistryTests
{
    private static PresenceRegistry CreateRegistry()
    {
        var proxy = new Mock<IClientProxy>();
        proxy
            .Setup(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var clients = new Mock<IHubClients>();
        clients.Setup(c => c.All).Returns(proxy.Object);

        var hub = new Mock<IHubContext<AdminHub>>();
        hub.Setup(h => h.Clients).Returns(clients.Object);

        return new PresenceRegistry(hub.Object, NullLogger<PresenceRegistry>.Instance);
    }

    [Fact]
    public void AdminConnected_MarksAdminOnline()
    {
        var registry = CreateRegistry();
        var adminId = Guid.NewGuid();

        registry.AdminConnected(adminId, "c1");

        Assert.True(registry.IsAdminOnline(adminId));
        Assert.Contains(adminId, registry.GetOnlineAdminIds());
    }

    [Fact]
    public void DuplicateJoin_OnSameConnection_DoesNotInflateCount()
    {
        var registry = CreateRegistry();
        var customerId = Guid.NewGuid();

        registry.CustomerConnected(customerId, "conn-a");
        registry.CustomerConnected(customerId, "conn-a");
        registry.CustomerDisconnected(customerId, "conn-a");

        // Only one logical connection existed; after disconnect the grace timer is running but still online.
        Assert.True(registry.IsCustomerOnline(customerId));
    }

    [Fact]
    public void Admin_StaysOnline_WhileAnotherConnectionRemains()
    {
        var registry = CreateRegistry();
        var adminId = Guid.NewGuid();

        registry.AdminConnected(adminId, "c1");
        registry.AdminConnected(adminId, "c2");
        registry.AdminDisconnected(adminId, "c1");

        Assert.True(registry.IsAdminOnline(adminId));
    }

    [Fact]
    public void Disconnect_KeepsOnlineDuringGracePeriod()
    {
        var registry = CreateRegistry();
        var adminId = Guid.NewGuid();

        registry.AdminConnected(adminId, "c1");
        registry.AdminDisconnected(adminId, "c1");

        Assert.True(registry.IsAdminOnline(adminId));
    }

    [Fact]
    public async Task Disconnect_GoesOffline_AfterGracePeriod()
    {
        var registry = CreateRegistry();
        var customerId = Guid.NewGuid();

        registry.CustomerConnected(customerId, "c1");
        registry.CustomerDisconnected(customerId, "c1");

        Assert.True(registry.IsCustomerOnline(customerId));

        await Task.Delay(TimeSpan.FromSeconds(31));

        Assert.False(registry.IsCustomerOnline(customerId));
    }

    [Fact]
    public void CustomerAndAdminPresence_AreTrackedIndependently()
    {
        var registry = CreateRegistry();
        var id = Guid.NewGuid();

        registry.CustomerConnected(id, "c1");

        Assert.True(registry.IsCustomerOnline(id));
        Assert.False(registry.IsAdminOnline(id));
        Assert.Contains(id, registry.GetOnlineCustomerIds());
    }
}
