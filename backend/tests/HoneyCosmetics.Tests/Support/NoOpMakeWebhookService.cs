using HoneyCosmetics.Application.Interfaces;

namespace HoneyCosmetics.Tests.Support;

internal sealed class NoOpMakeWebhookService : IMakeWebhookService
{
    public Task NotifyOrderCreatedAsync(
        MakeOrderWebhookData data,
        CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
