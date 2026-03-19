using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Controllers;

[Route("api/[controller]")]
[ApiController]
public class MultilingualController : ControllerBase
{
    private readonly IMultilingualGeneratorService _generator;
    private readonly ISpeechToTextService _sttService;
    private readonly ILogger<MultilingualController> _logger;

    public MultilingualController(
        IMultilingualGeneratorService generator,
        ISpeechToTextService sttService,
        ILogger<MultilingualController> logger
    )
    {
        _generator = generator;
        _sttService = sttService;
        _logger = logger;
    }

    /// <summary>
    /// Convert audio stream to base64 string for frontend preview
    /// </summary>
    private string ConvertStreamToBase64(Stream stream)
    {
        if (stream == null) return null;

        try
        {
            using (var memoryStream = new MemoryStream())
            {
                if (stream.CanSeek)
                    stream.Seek(0, SeekOrigin.Begin);

                stream.CopyTo(memoryStream);
                var bytes = memoryStream.ToArray();
                return Convert.ToBase64String(bytes);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error converting stream to base64");
            return null;
        }
    }

    /// <summary>
    /// Luồng 1: Text → Multilingual + Audio
    /// Generate multilingual content from text input
    /// </summary>
    [HttpPost("generate-from-text")]
    public async Task<IActionResult> GenerateFromText([FromBody] GenerateFromTextRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.SourceText))
                return BadRequest("Source text is required");

            if (request.TargetLanguages == null || request.TargetLanguages.Count == 0)
                return BadRequest("At least one target language is required");

            _logger.LogInformation("Generating multilingual content from text");

            var result = await _generator.GenerateMultilingualContentAsync(
                request.SourceText,
                request.SourceLanguage ?? "vi",
                request.TargetLanguages,
                new Progress<GenerationProgress>(p =>
                {
                    _logger.LogInformation(
                        "Progress: {current}/{total} - {status}",
                        p.CompletedLanguages,
                        p.TotalLanguages,
                        p.Status
                    );
                })
            );

            // Convert audio streams to base64 for frontend preview
            // Actual Cloudinary upload will be handled by POI Controller
            var audioDataMap = new Dictionary<string, string>();
            foreach (var content in result.Content)
            {
                try
                {
                    if (content.AudioStream != null && content.AudioStream.Length > 0)
                    {
                        _logger.LogInformation(
                            "Converting audio to base64 for {language}: {bytes} bytes",
                            content.LangCode,
                            content.AudioStream.Length
                        );

                        var audioBase64 = ConvertStreamToBase64(content.AudioStream);
                        audioDataMap[content.LangCode] = audioBase64;
                    }
                    else
                    {
                        _logger.LogWarning("Audio stream is null or empty for {language}", content.LangCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to convert audio to base64 for {language}", content.LangCode);
                }
                finally
                {
                    content.AudioStream?.Dispose();
                }
            }

            return Ok(new
            {
                success = true,
                data = result.Content.Select(c => new
                {
                    c.LangCode,
                    c.TranslatedText,
                    audioBase64 = audioDataMap.TryGetValue(c.LangCode, out var base64) ? base64 : null
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating multilingual content");
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    /// <summary>
    /// Luồng 2: MP3 → Text → Preprocess → Multilingual + Audio
    /// Generate multilingual content from audio file
    /// </summary>
    [HttpPost("generate-from-audio")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> GenerateFromAudio(
        [FromForm] GenerateFromAudioRequest request
    )
    {
        try
        {
            if (request.AudioFile == null || request.AudioFile.Length == 0)
                return BadRequest("Audio file is required");

            if (string.IsNullOrWhiteSpace(request.TargetLanguages))
                return BadRequest("Target languages is required");

            _logger.LogInformation("Generating multilingual content from audio file");

            // Transcribe MP3 → Vietnamese text
            _logger.LogInformation("Transcribing audio to text");
            var transcribedText = await _sttService.TranscribeAsync(request.AudioFile, "vi");

            if (string.IsNullOrWhiteSpace(transcribedText))
                return BadRequest("Failed to transcribe audio file");

            var targetLangs = request.TargetLanguages.Split(',')
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrEmpty(l))
                .ToList();

            if (targetLangs.Count == 0)
                return BadRequest("Invalid target languages");

            // Generate multilingual content
            var result = await _generator.GenerateMultilingualContentAsync(
                transcribedText,
                "vi",
                targetLangs,
                new Progress<GenerationProgress>(p =>
                {
                    _logger.LogInformation(
                        "Progress: {current}/{total} - {status}",
                        p.CompletedLanguages,
                        p.TotalLanguages,
                        p.Status
                    );
                })
            );

            // Convert audio streams to base64 for frontend preview
            var audioDataMap = new Dictionary<string, string>();
            foreach (var content in result.Content)
            {
                try
                {
                    if (content.AudioStream != null && content.AudioStream.Length > 0)
                    {
                        _logger.LogInformation(
                            "Converting audio to base64 for {language}: {bytes} bytes",
                            content.LangCode,
                            content.AudioStream.Length
                        );

                        var audioBase64 = ConvertStreamToBase64(content.AudioStream);
                        audioDataMap[content.LangCode] = audioBase64;
                    }
                    else
                    {
                        _logger.LogWarning("Audio stream is null or empty for {language}", content.LangCode);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to convert audio to base64 for {language}", content.LangCode);
                }
                finally
                {
                    content.AudioStream?.Dispose();
                }
            }

            return Ok(new
            {
                success = true,
                transcribedText,
                data = result.Content.Select(c => new
                {
                    c.LangCode,
                    c.TranslatedText,
                    audioBase64 = audioDataMap.TryGetValue(c.LangCode, out var base64) ? base64 : null
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating multilingual content from audio");
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }
}

public class GenerateFromTextRequest
{
    public string SourceText { get; set; } = string.Empty;
    public string? SourceLanguage { get; set; }
    public List<string> TargetLanguages { get; set; } = new();
}

public class GenerateFromAudioRequest
{
    public IFormFile? AudioFile { get; set; }
    public string TargetLanguages { get; set; } = string.Empty;
}
