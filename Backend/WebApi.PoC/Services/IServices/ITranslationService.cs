namespace WebApi.PoC.Services.IServices;

public interface ITranslationService
{
    /// <summary>
    /// Translate text to target language, respecting proper noun mappings
    /// </summary>
    Task<string> TranslateAsync(
        string text,
        string fromLang,
        string toLang,
        Dictionary<string, string>? entityMappings = null
    );
}
