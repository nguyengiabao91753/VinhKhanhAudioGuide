using System.Net.Http.Json;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class OllamaService : IOllamaService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OllamaService> _logger;
    private readonly string _pythonApiBaseUrl;

    public OllamaService(ILogger<OllamaService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _pythonApiBaseUrl = configuration["PythonAPI:BaseUrl"] ?? "http://localhost:5000";
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
    }

    public async Task<TextPreprocessResult> PreprocessTextAsync(string text, string language = "vi")
    {
        try
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return new TextPreprocessResult { FixedText = text, Entities = new() };
            }

            _logger.LogInformation("Calling Python API to preprocess text");

            var request = new
            {
                text,
                language
            };

            var response = await _httpClient.PostAsJsonAsync(
                $"{_pythonApiBaseUrl}/api/preprocess",
                request
            );

            response.EnsureSuccessStatusCode();

            var jsonString = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Preprocess raw response: {json}", jsonString);
            var result = System.Text.Json.JsonSerializer.Deserialize<PreprocessApiResponse>(
                jsonString,
                new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

            if (result?.Success == true)
            {
                return new TextPreprocessResult
                {
                    FixedText = result.FixedText ?? text,
                    Entities = result.Entities ?? new()
                };
            }

            _logger.LogWarning("Preprocessing returned success=false");
            return new TextPreprocessResult { FixedText = text, Entities = new() };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Python API");
            return new TextPreprocessResult { FixedText = text, Entities = new() };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error preprocessing text");
            return new TextPreprocessResult { FixedText = text, Entities = new() };
        }
    }

    private class PreprocessApiResponse
    {
        public bool Success { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("fixed_text")]
        public string? FixedText { get; set; }

        public List<NamedEntity>? Entities { get; set; }
    }   
}
