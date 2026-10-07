namespace OrderTracking.Application.Common.Interfaces;

public interface ITransactionalEmailSender
{
    bool IsConfigured { get; }
    Task SendAsync(string to, string subject, string html, string text, CancellationToken cancellationToken = default);
}
