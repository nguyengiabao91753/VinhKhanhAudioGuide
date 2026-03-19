namespace WebApi.PoC.Services.IServices;

public interface IOllamaService
{
    /// <summary>
    /// Preprocess text: fix grammar, identify proper nouns (địa danh, tên riêng, sự vật)
    /// Returns: fixed text + list of identified entities with their phonetic/proper names
    /// </summary>
    Task<TextPreprocessResult> PreprocessTextAsync(string text, string language = "vi");
}

public class TextPreprocessResult
{
    public string FixedText { get; set; } = string.Empty;
    public List<NamedEntity> Entities { get; set; } = new();
}

public class NamedEntity
{
    public string Original { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;  // "PERSON", "LOCATION", "LANDMARK", etc.
    public string ProperName { get; set; } = string.Empty;
    public Dictionary<string, string>? LocalizedNames { get; set; }  // e.g., {"en": "Mr Sáu", "fr": "M. Sáu"}
}
