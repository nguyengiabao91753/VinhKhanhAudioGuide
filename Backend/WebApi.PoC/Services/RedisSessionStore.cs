using System.Text.Json;
using StackExchange.Redis;
using WebApi.PoC.Models;

namespace WebApi.PoC.Services
{
    public class RedisSessionStore
    {
        private readonly IDatabase _db;
        private readonly RedisSettings _settings;
        private const string SessionKeyPrefix = "active_session:";
        private const string SessionSetKey = "active_sessions";

        public RedisSessionStore(IConnectionMultiplexer redis, RedisSettings settings)
        {
            _db = redis.GetDatabase();
            _settings = settings;
        }

        public async Task<ActiveSession?> GetSessionAsync(string sessionId)
        {
            var key = $"{SessionKeyPrefix}{sessionId}";
            var value = await _db.StringGetAsync(key);

            if (value.IsNullOrEmpty)
                return null;

            return JsonSerializer.Deserialize<ActiveSession>(value!);
        }

        public async Task SaveSessionAsync(ActiveSession session)
        {
            var key = $"{SessionKeyPrefix}{session.SessionId}";
            var json = JsonSerializer.Serialize(session);
            var ttl = TimeSpan.FromSeconds(_settings.SessionTtlSeconds);

            await _db.StringSetAsync(key, json, ttl);
            await _db.SetAddAsync(SessionSetKey, session.SessionId);
        }

        public async Task<List<ActiveSession>> GetActiveSessionsAsync()
        {
            var sessionIds = await _db.SetMembersAsync(SessionSetKey);
            var result = new List<ActiveSession>();
            var staleIds = new List<RedisValue>();

            foreach (var id in sessionIds)
            {
                var sessionId = id.ToString();
                var key = $"{SessionKeyPrefix}{sessionId}";
                var value = await _db.StringGetAsync(key);

                if (value.IsNullOrEmpty)
                {
                    staleIds.Add(id);
                    continue;
                }

                var session = JsonSerializer.Deserialize<ActiveSession>(value!);
                if (session != null)
                {
                    result.Add(session);
                }
            }

            if (staleIds.Count > 0)
            {
                foreach (var staleId in staleIds)
                {
                    await _db.SetRemoveAsync(SessionSetKey, staleId);
                }
            }

            return result
                .OrderByDescending(x => x.LastSeen)
                .ToList();
        }
    }
}