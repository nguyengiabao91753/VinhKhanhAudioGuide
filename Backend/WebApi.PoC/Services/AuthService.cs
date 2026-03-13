using WebApi.PoC.Models;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class AuthService : IAuthService
{
    private const string AdminUsername = "admin";
    private const string AdminPassword = "admin2026";

    public Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        if (request == null)
        {
            return Task.FromResult(new LoginResponse
            {
                Success = false,
                Message = "Invalid credentials"
            });
        }

        if (request.Username == AdminUsername && request.Password == AdminPassword)
        {
            return Task.FromResult(new LoginResponse
            {
                Success = true,
                Message = "Login successful",
                Data = new LoginResponse.LoginData
                {
                    Username = AdminUsername,
                    Token = "mock-admin-token"
                }
            });
        }

        return Task.FromResult(new LoginResponse
        {
            Success = false,
            Message = "Invalid username or password"
        });
    }
}
