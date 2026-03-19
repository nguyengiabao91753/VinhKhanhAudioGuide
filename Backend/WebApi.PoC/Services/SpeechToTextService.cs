using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class SpeechToTextService : ISpeechToTextService
{
    private readonly ILogger<SpeechToTextService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _pythonApiBaseUrl;

    public SpeechToTextService(ILogger<SpeechToTextService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _pythonApiBaseUrl = configuration["PythonAPI:BaseUrl"] ?? "http://localhost:5000";
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(2) };
    }

    public async Task<string> TranscribeAsync(IFormFile audioFile, string language = "vi")
    {
        try
        {
            if (audioFile?.Length == 0)
                throw new ArgumentException("Audio file is empty");

            _logger.LogInformation("Calling Python API to transcribe audio");

            using var content = new MultipartFormDataContent();
            using var fileStream = audioFile!.OpenReadStream();
            content.Add(new StreamContent(fileStream), "audio_file", audioFile.FileName);
            content.Add(new StringContent(language), "language");

            var response = await _httpClient.PostAsync(
                $"{_pythonApiBaseUrl}/api/transcribe",
                content
            );

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TranscribeApiResponse>();

            if (result?.Success == true && !string.IsNullOrEmpty(result.TranscribedText))
            {
                _logger.LogInformation("Transcription successful");
                return result.TranscribedText;
            }

            _logger.LogWarning("Transcription returned success=false");
            return "";
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Python API");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to transcribe audio");
            throw;
        }
    }

    private class TranscribeApiResponse
    {
        public bool Success { get; set; }
        public string? TranscribedText { get; set; }
    }
}
