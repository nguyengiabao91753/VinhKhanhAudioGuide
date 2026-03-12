using WebApi.PoC.Models;

namespace WebApi.PoC.Services.IServices;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
}
