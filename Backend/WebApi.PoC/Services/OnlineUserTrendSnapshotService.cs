using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace WebApi.PoC.Services
{
    public class OnlineUserTrendSnapshotService : BackgroundService
    {
        private readonly RedisSessionStore _redisSessionStore;
        private readonly IConnectionMultiplexer _redis;
        private readonly ILogger<OnlineUserTrendSnapshotService> _logger;

        public OnlineUserTrendSnapshotService(
            RedisSessionStore redisSessionStore,
            IConnectionMultiplexer redis,
            ILogger<OnlineUserTrendSnapshotService> logger)
        {
            _redisSessionStore = redisSessionStore;
            _redis = redis;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OnlineUserTrendSnapshotService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SaveSnapshotAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to save online trend snapshot.");
                }

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }

        private async Task SaveSnapshotAsync()
        {
            var activeSessions = await _redisSessionStore.GetActiveSessionsAsync();
            int onlineCount = activeSessions.Count;

            var db = _redis.GetDatabase();
            var now = DateTime.Now;

            string redisKey = $"analytics:online:{now:yyyyMMdd}";
            string field = now.ToString("HH:mm");

            await db.HashSetAsync(redisKey, field, onlineCount);

            // Giữ dữ liệu 30 ngày
            await db.KeyExpireAsync(redisKey, TimeSpan.FromDays(30));

            _logger.LogInformation("Saved online snapshot: {Field} = {Count}", field, onlineCount);
        }
    }
}