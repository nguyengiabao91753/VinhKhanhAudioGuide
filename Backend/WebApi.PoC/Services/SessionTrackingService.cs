using Microsoft.EntityFrameworkCore;
using WebApi.PoC.Dtos;
using WebApi.PoC.Models;

namespace WebApi.PoC.Services
{
    public class SessionTrackingService : ISessionTrackingService
    {
        private static readonly TimeSpan DbSyncInterval = TimeSpan.FromSeconds(60);

        private readonly ILogger<SessionTrackingService> _logger;
        private readonly RedisSessionStore _store;
        private readonly AppDbContext _dbContext;

        public SessionTrackingService(
            ILogger<SessionTrackingService> logger,
            RedisSessionStore store,
            AppDbContext dbContext)
        {
            _logger = logger;
            _store = store;
            _dbContext = dbContext;
        }

        public async Task PingAsync(SessionPingRequest request)
        {
            var now = DateTime.UtcNow;
            var existing = await _store.GetSessionAsync(request.SessionId);

            var userAgentRaw = !string.IsNullOrWhiteSpace(request.UserAgentRaw)
                ? request.UserAgentRaw
                : request.UserAgent;

            var deviceType = !string.IsNullOrWhiteSpace(request.DeviceType)
                ? request.DeviceType.ToLower()
                : DetectDeviceType(userAgentRaw);

            var deviceDisplayName = !string.IsNullOrWhiteSpace(request.DeviceDisplayName)
                ? request.DeviceDisplayName
                : BuildDeviceDisplayName(
                    userAgentRaw,
                    request.BrowserName,
                    deviceType,
                    request.DeviceModel
                );

            var session = new ActiveSession
            {
                SessionId = request.SessionId,
                Lang = !string.IsNullOrWhiteSpace(request.Lang)
                    ? request.Lang
                    : existing?.Lang ?? "vi",

                CurrentPoiId = request.CurrentPoiId ?? existing?.CurrentPoiId,
                TourId = request.TourId ?? existing?.TourId,
                Lat = request.Lat ?? existing?.Lat,
                Lng = request.Lng ?? existing?.Lng,

                Device = deviceDisplayName,
                FirstSeen = existing?.FirstSeen ?? now,
                LastSeen = now,

                DeviceInstanceId = !string.IsNullOrWhiteSpace(request.DeviceInstanceId)
                    ? request.DeviceInstanceId
                    : existing?.DeviceInstanceId ?? string.Empty,

                DeviceDisplayName = deviceDisplayName,
                DeviceType = deviceType,
                DeviceModel = request.DeviceModel ?? existing?.DeviceModel,
                BrowserName = request.BrowserName ?? existing?.BrowserName,
                OsName = request.OsName ?? existing?.OsName,

                Timezone = request.Timezone ?? existing?.Timezone,
                ScreenWidth = request.ScreenWidth ?? existing?.ScreenWidth,
                ScreenHeight = request.ScreenHeight ?? existing?.ScreenHeight,

                UserAgent = request.UserAgent ?? existing?.UserAgent,
                UserAgentRaw = userAgentRaw ?? existing?.UserAgentRaw,

                CurrentPoiName = request.CurrentPoiName ?? existing?.CurrentPoiName,
                TourName = request.TourName ?? existing?.TourName,

                LastDbPersistAt = existing?.LastDbPersistAt
            };

            var shouldPersistToDb =
                existing == null ||
                HasImportantChange(existing, session) ||
                !session.LastDbPersistAt.HasValue ||
                now - session.LastDbPersistAt.Value >= DbSyncInterval;

            if (shouldPersistToDb)
            {
                await UpsertVisitorSessionAsync(session, now);
                session.LastDbPersistAt = now;
            }

            await _store.SaveSessionAsync(session);

            _logger.LogInformation(
                "PING | SessionId={SessionId} | Lang={Lang} | Poi={PoiId} | Tour={TourId} | Device={Device} | DeviceId={DeviceInstanceId} | Lat={Lat} | Lng={Lng} | Persisted={Persisted}",
                session.SessionId,
                session.Lang,
                session.CurrentPoiId,
                session.TourId,
                session.DeviceDisplayName,
                session.DeviceInstanceId,
                session.Lat,
                session.Lng,
                shouldPersistToDb
            );
        }

        public async Task<List<ActiveSession>> GetActiveSessionsAsync()
        {
            return await _store.GetActiveSessionsAsync();
        }

        public async Task MarkExpiredSessionOfflineAsync(string sessionId)
        {
            var entity = await _dbContext.VisitorSessions
                .FirstOrDefaultAsync(x => x.SessionId == sessionId);

            if (entity == null)
                return;

            if (entity.Status == "offline")
                return;

            entity.Status = "offline";
            entity.EndedAt = entity.LastSeenAt;
            entity.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation(
                "SESSION OFFLINE | SessionId={SessionId} | EndedAt={EndedAt}",
                entity.SessionId,
                entity.EndedAt
            );
        }

        private bool HasImportantChange(ActiveSession oldSession, ActiveSession newSession)
        {
            return oldSession.Lang != newSession.Lang
                || oldSession.CurrentPoiId != newSession.CurrentPoiId
                || oldSession.TourId != newSession.TourId
                || oldSession.DeviceInstanceId != newSession.DeviceInstanceId
                || oldSession.DeviceDisplayName != newSession.DeviceDisplayName
                || oldSession.CurrentPoiName != newSession.CurrentPoiName
                || oldSession.TourName != newSession.TourName;
        }

        private async Task UpsertVisitorSessionAsync(ActiveSession session, DateTime now)
        {
            var entity = await _dbContext.VisitorSessions
                .FirstOrDefaultAsync(x => x.SessionId == session.SessionId);

            if (entity == null)
            {
                entity = new VisitorSession
                {
                    SessionId = session.SessionId,
                    StartedAt = session.FirstSeen,
                    CreatedAt = now
                };

                _dbContext.VisitorSessions.Add(entity);
            }

            entity.DeviceInstanceId = session.DeviceInstanceId;
            entity.DeviceDisplayName = session.DeviceDisplayName;
            entity.DeviceType = session.DeviceType;
            entity.DeviceModel = session.DeviceModel;
            entity.BrowserName = session.BrowserName;
            entity.OsName = session.OsName;

            entity.Lang = session.Lang;
            entity.Timezone = session.Timezone;
            entity.ScreenWidth = session.ScreenWidth;
            entity.ScreenHeight = session.ScreenHeight;
            entity.UserAgentRaw = session.UserAgentRaw;

            entity.CurrentPoiId = session.CurrentPoiId;
            entity.CurrentPoiName = session.CurrentPoiName;
            entity.TourId = session.TourId;
            entity.TourName = session.TourName;

            entity.Lat = session.Lat;
            entity.Lng = session.Lng;

            entity.LastSeenAt = now;
            entity.EndedAt = null;
            entity.Status = "online";
            entity.UpdatedAt = now;

            await _dbContext.SaveChangesAsync();
        }

        private string DetectDeviceType(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent))
                return "desktop";

            var ua = userAgent.ToLower();

            if (ua.Contains("mobile") || ua.Contains("android") || ua.Contains("iphone") || ua.Contains("ipad"))
                return "mobile";

            return "desktop";
        }

        private string BuildDeviceDisplayName(
            string? userAgent,
            string? browserName,
            string deviceType,
            string? deviceModel)
        {
            var browser = !string.IsNullOrWhiteSpace(browserName)
                ? browserName
                : DetectBrowserName(userAgent);

            if (!string.IsNullOrWhiteSpace(deviceModel))
                return $"{deviceModel} · {browser}";

            if (string.IsNullOrWhiteSpace(userAgent))
                return deviceType == "mobile"
                    ? $"Mobile · {browser}"
                    : $"Desktop · {browser}";

            var ua = userAgent.ToLower();

            if (ua.Contains("iphone"))
                return $"iPhone · {browser}";

            if (ua.Contains("ipad"))
                return $"iPad · {browser}";

            if (ua.Contains("android"))
                return $"Android · {browser}";

            if (ua.Contains("windows"))
                return $"Windows PC · {browser}";

            if (ua.Contains("macintosh") || ua.Contains("mac os"))
                return $"Mac · {browser}";

            if (ua.Contains("linux"))
                return $"Linux PC · {browser}";

            return deviceType == "mobile"
                ? $"Mobile · {browser}"
                : $"Desktop · {browser}";
        }

        private string DetectBrowserName(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent))
                return "Unknown";

            var ua = userAgent.ToLower();

            if (ua.Contains("edg"))
                return "Edge";

            if (ua.Contains("opr") || ua.Contains("opera"))
                return "Opera";

            if (ua.Contains("chrome") && !ua.Contains("edg"))
                return "Chrome";

            if (ua.Contains("safari") && !ua.Contains("chrome"))
                return "Safari";

            if (ua.Contains("firefox"))
                return "Firefox";

            return "Unknown";
        }
    }
}