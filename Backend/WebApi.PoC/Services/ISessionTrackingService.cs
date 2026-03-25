using WebApi.PoC.Dtos;
using WebApi.PoC.Models;

namespace WebApi.PoC.Services
{
    public interface ISessionTrackingService
    {
        Task PingAsync(SessionPingRequest request);
        Task<List<ActiveSession>> GetActiveSessionsAsync();
    }
}