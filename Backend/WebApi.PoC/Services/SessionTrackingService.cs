using WebApi.PoC.Dtos;
using WebApi.PoC.Models;

namespace WebApi.PoC.Services
{
    public class SessionTrackingService : ISessionTrackingService
    {
        private readonly ILogger<SessionTrackingService> _logger;
        private readonly RedisSessionStore _store;

        public SessionTrackingService(
            ILogger<SessionTrackingService> logger,
            RedisSessionStore store)
        {
            _logger = logger;
            _store = store;
        }

        public async Task PingAsync(SessionPingRequest request)
        {
            var now = DateTime.UtcNow;
            var device = DetectDevice(request.UserAgent);

            var existing = await _store.GetSessionAsync(request.SessionId);

            var session = new ActiveSession
            {
                SessionId = request.SessionId,
                Lang = request.Lang,
                CurrentPoiId = request.CurrentPoiId,
                TourId = request.TourId,
                Lat = request.Lat,
                Lng = request.Lng,
                Device = device,
                FirstSeen = existing?.FirstSeen ?? now,
                LastSeen = now
            };

            await _store.SaveSessionAsync(session);

            _logger.LogInformation(
                "PING | SessionId={SessionId} | Lang={Lang} | Poi={PoiId} | Tour={TourId} | Device={Device} | Lat={Lat} | Lng={Lng}",
                request.SessionId,
                request.Lang,
                request.CurrentPoiId,
                request.TourId,
                device,
                request.Lat,
                request.Lng
            );
        }

        public async Task<List<ActiveSession>> GetActiveSessionsAsync()
        {
            return await _store.GetActiveSessionsAsync();
        }

        private string DetectDevice(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent))
                return "unknown";

            var ua = userAgent.ToLower();

            if (ua.Contains("mobile") || ua.Contains("android") || ua.Contains("iphone"))
                return "mobile";

            return "desktop";
        }
    }
}