namespace WebApi.PoC.Services.IServices;

public interface IMultilingualGeneratorService
{
    /// <summary>
    /// Orchestrate: preprocess → translate → generate audio for multiple languages
    /// </summary>
    Task<MultilingualGenerationResult> GenerateMultilingualContentAsync(
        string sourceText,
        string sourceLanguage,
        List<string> targetLanguages,
        IProgress<GenerationProgress>? progress = null
    );
}

public class MultilingualGenerationResult
{
    public List<LocalizedAudioContent> Content { get; set; } = new();
}

public class LocalizedAudioContent
{
    public string LangCode { get; set; } = string.Empty;
    public string TranslatedText { get; set; } = string.Empty;
    public Stream AudioStream { get; set; } = Stream.Null;
    public string AudioFileName { get; set; } = string.Empty;
}

public class GenerationProgress
{
    public string CurrentLanguage { get; set; } = string.Empty;
    public int CompletedLanguages { get; set; }
    public int TotalLanguages { get; set; }
    public string Status { get; set; } = string.Empty;
}
