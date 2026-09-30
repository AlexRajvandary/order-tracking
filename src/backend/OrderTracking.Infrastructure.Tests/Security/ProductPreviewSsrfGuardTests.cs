using System.Net;
using OrderTracking.Infrastructure.ProductPreviews;
using Xunit;

namespace OrderTracking.Infrastructure.Tests.Security;

public sealed class ProductPreviewSsrfGuardTests
{
    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("10.0.0.1")]
    [InlineData("172.16.0.1")]
    [InlineData("192.168.1.1")]
    [InlineData("169.254.169.254")]
    [InlineData("100.64.0.1")]
    [InlineData("192.0.2.1")]
    [InlineData("198.51.100.1")]
    [InlineData("203.0.113.1")]
    [InlineData("::1")]
    [InlineData("fe80::1")]
    [InlineData("fc00::1")]
    [InlineData("2001:db8::1")]
    public void IsPublicAddress_rejects_non_public_ranges(string value)
    {
        Assert.False(ProductPreviewSsrfGuard.IsPublicAddress(IPAddress.Parse(value)));
    }

    [Theory]
    [InlineData("1.1.1.1")]
    [InlineData("8.8.8.8")]
    [InlineData("2606:4700:4700::1111")]
    public void IsPublicAddress_allows_public_addresses(string value)
    {
        Assert.True(ProductPreviewSsrfGuard.IsPublicAddress(IPAddress.Parse(value)));
    }

    [Theory]
    [InlineData("file:///etc/passwd")]
    [InlineData("http://localhost/image")]
    [InlineData("http://service.local/image")]
    public async Task IsAllowedAsync_rejects_unsafe_schemes_and_hosts_without_network(string value)
    {
        Assert.False(await ProductPreviewSsrfGuard.IsAllowedAsync(new Uri(value)));
    }
}
