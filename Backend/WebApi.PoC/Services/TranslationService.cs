using System.Net.Http.Json;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class TranslationService : ITranslationService
{
    private readonly ILogger<TranslationService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _pythonApiBaseUrl;
    private static readonly Dictionary<string, string> _cache = new();

    public TranslationService(ILogger<TranslationService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _pythonApiBaseUrl = configuration["PythonAPI:BaseUrl"] ?? "http://localhost:5000";
        _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
    }

    public async Task<string> TranslateAsync(
        string text,
        string fromLang,
        string toLang,
        Dictionary<string, string>? entityMappings = null
    )
    {
        if (string.IsNullOrWhiteSpace(text))
            return text;

        if (fromLang.Equals(toLang, StringComparison.OrdinalIgnoreCase))
            return text;

        var cacheKey = $"{fromLang}_{toLang}_{text}";
        if (_cache.TryGetValue(cacheKey, out var cachedResult))
        {
            return cachedResult;
        }

        try
        {
            _logger.LogInformation("Calling Python API to translate from {from} to {to}", fromLang, toLang);

            var request = new
            {
                text,
                from_lang = fromLang,
                to_lang = toLang,
                entity_mappings = entityMappings ?? new Dictionary<string, string>()
            };

            var response = await _httpClient.PostAsJsonAsync(
                $"{_pythonApiBaseUrl}/api/translate",
                request
            );

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TranslateApiResponse>();

            var rawJson = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Translation raw response: {json}", rawJson);

            if (result?.Success == true && !string.IsNullOrEmpty(result.TranslatedText))
            {
                _cache[cacheKey] = result.TranslatedText;
                return result.TranslatedText;
            }

            _logger.LogWarning("Translation returned success=false");
            return text;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Python API");
            return text;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Translation error");
            return text;
        }
    }

    private class TranslateApiResponse
    {
        public bool Success { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("translated_text")]
        public string? TranslatedText { get; set; }
    }
}
