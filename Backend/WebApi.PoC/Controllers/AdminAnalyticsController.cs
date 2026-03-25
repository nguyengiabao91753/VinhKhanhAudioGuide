using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Services;

namespace WebApi.PoC.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminAnalyticsController : ControllerBase
    {
        private readonly ISessionTrackingService _sessionTrackingService;

        public AdminAnalyticsController(ISessionTrackingService sessionTrackingService)
        {
            _sessionTrackingService = sessionTrackingService;
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
    }
}