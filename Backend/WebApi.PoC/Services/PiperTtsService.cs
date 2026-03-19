using System.Net.Http.Json;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class PiperTtsService : IPiperTtsService
{
    private readonly ILogger<PiperTtsService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _pythonApiBaseUrl;

    public PiperTtsService(ILogger<PiperTtsService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _pythonApiBaseUrl = configuration["PythonAPI:BaseUrl"] ?? "http://localhost:5000";
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
    }

    public async Task<Stream> GenerateAudioAsync(string text, string languageCode, long? speakerId = null)
    {
        return await Task.Run(async () =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(text))
                    throw new ArgumentException("Text cannot be empty");

                _logger.LogInformation("Calling Python API to generate audio for {language}", languageCode);

                var request = new
                {
                    text,
                    language_code = languageCode
                };

                var response = await _httpClient.PostAsJsonAsync(
                    $"{_pythonApiBaseUrl}/api/generate-audio",
                    request
                );

                response.EnsureSuccessStatusCode();

                var audioBytes = await response.Content.ReadAsByteArrayAsync();

                if (audioBytes == null || audioBytes.Length == 0)
                {
                    throw new InvalidOperationException("No audio data returned from Python API");
                }

                _logger.LogInformation("Audio generation successful");

                return (Stream)new MemoryStream(audioBytes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate audio with Python API");
                throw;
            }
        });
    }
}
