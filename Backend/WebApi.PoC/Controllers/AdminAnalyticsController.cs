using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;
using System.Globalization;
using WebApi.PoC.Services;

namespace WebApi.PoC.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminAnalyticsController : ControllerBase
    {
        private readonly ISessionTrackingService _sessionTrackingService;
        private readonly IConnectionMultiplexer _redis;

        public AdminAnalyticsController(
            ISessionTrackingService sessionTrackingService,
            IConnectionMultiplexer redis)
        {
            _sessionTrackingService = sessionTrackingService;
            _redis = redis;
        }

        [HttpGet("active-users")]
        public async Task<IActionResult> GetActiveUsers()
        {
            var sessions = await _sessionTrackingService.GetActiveSessionsAsync();

            var result = new
            {
                total = sessions.Count,
                sessions = sessions.Select(x => new
                {
                    x.SessionId,
                    x.Lang,
                    x.CurrentPoiId,
                    x.TourId,
                    x.Lat,
                    x.Lng,
                    x.Device,
                    x.FirstSeen,
                    x.LastSeen,
                    onlineSeconds = (int)(x.LastSeen - x.FirstSeen).TotalSeconds
                })
            };

            return Ok(result);
        }

        [HttpGet("active-users/stream")]
        public async Task StreamActiveUsers()
        {
            Response.Headers.Append("Content-Type", "text/event-stream");
            Response.Headers.Append("Cache-Control", "no-cache");
            Response.Headers.Append("Connection", "keep-alive");

            while (!HttpContext.RequestAborted.IsCancellationRequested)
            {
                var sessions = await _sessionTrackingService.GetActiveSessionsAsync();

                var payload = new
                {
                    total = sessions.Count,
                    sessions = sessions.Select(x => new
                    {
                        sessionId = x.SessionId,
                        lang = x.Lang,
                        currentPoiId = x.CurrentPoiId,
                        tourId = x.TourId,
                        lat = x.Lat,
                        lng = x.Lng,
                        device = x.Device,
                        firstSeen = x.FirstSeen,
                        lastSeen = x.LastSeen,
                        onlineSeconds = (int)(x.LastSeen - x.FirstSeen).TotalSeconds
                    })
                };

                var json = JsonSerializer.Serialize(payload);

                await Response.WriteAsync($"event: activeUsers\n");
                await Response.WriteAsync($"data: {json}\n\n");
                await Response.Body.FlushAsync();

                await Task.Delay(5000, HttpContext.RequestAborted);
            }
        }

        [HttpGet("analytics/online-trend")]
        public async Task<IActionResult> GetOnlineTrend([FromQuery] DateTime? date = null)
        {
            var targetDate = (date ?? DateTime.Today).Date;
            var db = _redis.GetDatabase();

            string redisKey = $"analytics:online:{targetDate:yyyyMMdd}";
            var entries = await db.HashGetAllAsync(redisKey);

            var rawData = entries
                .Select(x =>
                {
                    var timeText = x.Name.ToString();
                    var valueText = x.Value.ToString();

                    TimeSpan.TryParse(timeText, CultureInfo.InvariantCulture, out var time);
                    int.TryParse(valueText, out var users);

                    return new
                    {
                        Time = time,
                        Users = users
                    };
                })
                .ToList();

            var result = Enumerable.Range(0, 24)
                .Select(hour =>
                {
                    var valuesInHour = rawData
                        .Where(x => x.Time.Hours == hour)
                        .Select(x => x.Users);

                    return new
                    {
                        hour = $"{hour:00}:00",
                        users = valuesInHour.Any() ? valuesInHour.Max() : 0
                    };
                })
                .ToList();

            return Ok(new
            {
                date = targetDate.ToString("yyyy-MM-dd"),
                data = result
            });
        }
    }
}