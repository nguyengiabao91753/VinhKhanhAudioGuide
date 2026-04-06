using Microsoft.Extensions.Hosting;
using StackExchange.Redis;

namespace WebApi.PoC.Services
{
    public class SessionCleanupHostedService : BackgroundService
    {
        private const string SessionKeyPrefix = "active_session:";
        private const string SessionSetKey = "active_sessions";

        private readonly IConnectionMultiplexer _redis;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SessionCleanupHostedService> _logger;

        public SessionCleanupHostedService(
            IConnectionMultiplexer redis,
            IServiceScopeFactory scopeFactory,
            ILogger<SessionCleanupHostedService> logger)
        {
            _redis = redis;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("SessionCleanupHostedService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupExpiredSessionsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to cleanup expired sessions.");
                }

                await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);
            }
        }

        private async Task CleanupExpiredSessionsAsync()
        {
            var db = _redis.GetDatabase();
            var sessionIds = await db.SetMembersAsync(SessionSetKey);

            if (sessionIds.Length == 0)
                return;

            foreach (var item in sessionIds)
            {
                var sessionId = item.ToString();
                if (string.IsNullOrWhiteSpace(sessionId))
                    continue;

                var sessionKey = $"{SessionKeyPrefix}{sessionId}";
                var exists = await db.KeyExistsAsync(sessionKey);

                if (exists)
                    continue;

                using var scope = _scopeFactory.CreateScope();
                var sessionTrackingService = scope.ServiceProvider.GetRequiredService<ISessionTrackingService>();

                await sessionTrackingService.MarkExpiredSessionOfflineAsync(sessionId);
                await db.SetRemoveAsync(SessionSetKey, item);

                _logger.LogInformation(
                    "Expired session cleaned up | SessionId={SessionId}",
                    sessionId
                );
            }
        }
    }
}