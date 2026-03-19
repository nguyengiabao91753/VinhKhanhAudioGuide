using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using WebApi.PoC.Dtos;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IOptions<CloudinarySetting> config)
        {
            var acc = new Account
                (
                    config.Value.CloudName,
                    config.Value.ApiKey,
                    config.Value.ApiSecret
                );
            _cloudinary  = new Cloudinary(acc);
        }

        public async Task<String?> UploadImageAsync(IFormFile file)
        {
            var uploadResult = new ImageUploadResult();

            if (file.Length >0)
            {
                using var stream = file.OpenReadStream();
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    Transformation = new Transformation().Width(500).Height(500).Crop("fill")
                };

                uploadResult = await _cloudinary.UploadAsync(uploadParams);
            }

            return uploadResult.SecureUrl.ToString();
        }

        public async Task<String?> UploadAudioAsync(Stream audioStream, string fileName)
        {
            if (audioStream == null || audioStream.Length == 0)
                return null;

            try
            {
                // IMPORTANT: Reset stream position to 0 before uploading
                // Stream position might be at the end after being read/written
                if (audioStream.CanSeek)
                {
                    audioStream.Seek(0, SeekOrigin.Begin);
                }

                var uploadParams = new VideoUploadParams
                {
                    File = new FileDescription(fileName, audioStream),
                    PublicId = Path.GetFileNameWithoutExtension(fileName),
                    UseFilename = true,
                    Overwrite = false
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                return uploadResult.SecureUrl?.ToString();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to upload audio to Cloudinary: {ex.Message}", ex);
            }
        }
    }
}
