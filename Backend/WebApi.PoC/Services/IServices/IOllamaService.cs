using System.Text.Json.Serialization;
using System.Text.Json.Serialization;


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
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("proper_name")]
    public string ProperName { get; set; } = string.Empty;

    [JsonPropertyName("english_pronunciation")]
    public string EnglishPronunciation { get; set; } = string.Empty;

    [JsonPropertyName("localized_names")]
    public Dictionary<string, string>? LocalizedNames { get; set; }
}
