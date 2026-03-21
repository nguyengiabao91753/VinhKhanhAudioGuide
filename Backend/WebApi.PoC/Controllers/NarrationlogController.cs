using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace WebApi.PoC.Controllers;
[Route("api/[controller]")]
[ApiController]
public class NarrationlogController : ControllerBase
{
    private static readonly List<NarrationLogDto> _logs = [];
    private static readonly object _lock = new();

    /// <summary>POST /api/narration-log — log a narration event</summary>
    [HttpPost]
    public IActionResult Log([FromBody] NarrationLogDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PoiId)) return BadRequest("poiId required");

        lock (_lock)
        {
            _logs.Add(dto);
            // Keep last 1000 entries in-memory
            if (_logs.Count > 1000) _logs.RemoveAt(0);
        }

        return Ok(new { success = true });
    }

    /// <summary>GET /api/narration-log — recent entries (admin)</summary>
    [HttpGet]
    public IActionResult GetAll([FromQuery] int limit = 100)
    {
        lock (_lock)
        {
            return Ok(_logs.TakeLast(Math.Clamp(limit, 1, 500)));
        }
    }

    /// <summary>GET /api/narration-log/config — Geofence config for FE</summary>
    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        // Values can be moved to appsettings.json / environment variables
        var config = new GeofenceConfigDto(
            BufferRadiusMeters: 100,
            CoreRadiusMeters: 30,
            EnterDebounceMs: 3000,
            CooldownMs: 300_000,    // 5 minutes
            CruisePollMs: 5000,
            ApproachPollMs: 1000
        );
        return Ok(config);
    }
}
public record NarrationLogDto(
    string PoiId,
    string Language,
    string Source,   // "audio" | "tts" | "auto"
    string Timestamp
);
public record GeofenceConfigDto(
    int BufferRadiusMeters,
    int CoreRadiusMeters,
    int EnterDebounceMs,
    int CooldownMs,
    int CruisePollMs,
    int ApproachPollMs
);