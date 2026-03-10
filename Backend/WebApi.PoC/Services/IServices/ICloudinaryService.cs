using CloudinaryDotNet.Actions;

namespace WebApi.PoC.Services.IServices
{
    public interface ICloudinaryService
    {
       public Task<String?> UploadImageAsync(IFormFile file);
    }
}
