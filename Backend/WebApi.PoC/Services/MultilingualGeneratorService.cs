using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class MultilingualGeneratorService : IMultilingualGeneratorService
{
    private readonly IOllamaService _ollamaService;
    private readonly ITranslationService _translationService;
    private readonly IPiperTtsService _ttsService;
    private readonly ILogger<MultilingualGeneratorService> _logger;

    public MultilingualGeneratorService(
        IOllamaService ollamaService,
        ITranslationService translationService,
        IPiperTtsService ttsService,
        ILogger<MultilingualGeneratorService> logger
    )
    {
        _ollamaService = ollamaService;
        _translationService = translationService;
        _ttsService = ttsService;
        _logger = logger;
    }

    public async Task<MultilingualGenerationResult> GenerateMultilingualContentAsync(
        string sourceText,
        string sourceLanguage,
        List<string> targetLanguages,
        IProgress<GenerationProgress>? progress = null
    )
    {
        try
        {
            var result = new MultilingualGenerationResult();

            // Step 1: Preprocess source text with Ollama
            _logger.LogInformation("Starting preprocessing with Ollama");
            progress?.Report(new GenerationProgress
            {
                Status = "Preprocessing text with Ollama...",
                CompletedLanguages = 0,
                TotalLanguages = targetLanguages.Count
            });

            var preprocessed = await _ollamaService.PreprocessTextAsync(sourceText, sourceLanguage);

            // Create entity mappings for translation preservation
            var entityMappings = new Dictionary<string, string>();
            foreach (var entity in preprocessed.Entities)
            {
                if (!string.IsNullOrEmpty(entity.Original) && !string.IsNullOrEmpty(entity.ProperName))
                {
                    entityMappings[entity.Original] = entity.ProperName;
                }
            }

            // Step 2: Generate content for each target language
            var completedCount = 0;
            var semaphore = new SemaphoreSlim(3);  // Limit concurrent operations to 3

            var tasks = targetLanguages.Select(async targetLang =>
            {
                await semaphore.WaitAsync();
                try
                {
                    progress?.Report(new GenerationProgress
                    {
                        CurrentLanguage = targetLang,
                        CompletedLanguages = completedCount,
                        TotalLanguages = targetLanguages.Count,
                        Status = $"Processing {targetLang}..."
                    });

                    // Translate text
                    _logger.LogInformation("Translating to {language}", targetLang);
                    var translatedText = await _translationService.TranslateAsync(
                        preprocessed.FixedText,
                        sourceLanguage,
                        targetLang,
                        entityMappings
                    );

                    // Generate audio
                    _logger.LogInformation("Generating audio for {language}", targetLang);
                    Stream audioStream = null;
                    try
                    {
                        audioStream = await _ttsService.GenerateAudioAsync(translatedText, targetLang);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to generate audio for {language}, skipping TTS", targetLang);
                        // Continue without audio - audioStream will be null
                    }

                    var content = new LocalizedAudioContent
                    {
                        LangCode = targetLang,
                        TranslatedText = translatedText,
                        AudioStream = audioStream,
                        AudioFileName = $"poi_{Guid.NewGuid()}_{targetLang}.wav"
                    };

                    Interlocked.Increment(ref completedCount);
                    progress?.Report(new GenerationProgress
                    {
                        CurrentLanguage = targetLang,
                        CompletedLanguages = completedCount,
                        TotalLanguages = targetLanguages.Count,
                        Status = $"Completed {targetLang}"
                    });

                    return content;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error processing {language}", targetLang);
                    throw;
                }
                finally
                {
                    semaphore.Release();
                }
            }).ToList();

            var contents = await Task.WhenAll(tasks);
            result.Content.AddRange(contents);

            _logger.LogInformation("Completed multilingual generation for {count} languages", targetLanguages.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during multilingual generation");
            throw;
        }
    }
}
