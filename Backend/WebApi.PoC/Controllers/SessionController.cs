using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Dtos;
using WebApi.PoC.Services;

namespace WebApi.PoC.Controllers
{
    [ApiController]
    [Route("api/session")]
    public class SessionController : ControllerBase
    {
        private readonly ISessionTrackingService _sessionTrackingService;

        public SessionController(ISessionTrackingService sessionTrackingService)
        {
            _sessionTrackingService = sessionTrackingService;
        }

        [HttpPost("ping")]
        public async Task<IActionResult> Ping([FromBody] SessionPingRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SessionId))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "SessionId is required"
                });
            }

            await _sessionTrackingService.PingAsync(request);

            return Ok(new
            {
                success = true,
                serverTime = DateTime.UtcNow
            });
        }
    }
}