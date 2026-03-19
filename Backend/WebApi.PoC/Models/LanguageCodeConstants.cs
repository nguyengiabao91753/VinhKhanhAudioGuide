namespace WebApi.PoC.Models;

public static class LanguageCodeConstants
{
    // Language codes
    public const string Vietnamese = "vi";
    public const string English = "en";
    public const string Spanish = "es";
    public const string French = "fr";
    public const string German = "de";
    public const string Italian = "it";
    public const string Portuguese = "pt";
    public const string Russian = "ru";
    public const string Chinese = "zh";
    public const string Japanese = "ja";
    public const string Korean = "ko";
    public const string Thai = "th";
    public const string Indonesian = "id";
    public const string Filipino = "fil";
    public const string Malaysian = "ms";
    public const string Burmese = "my";
    public const string Khmer = "km";
    public const string Lao = "lo";
    public const string Turkish = "tr";
    public const string Polish = "pl";
    public const string Swedish = "sv";
    public const string Norwegian = "no";
    public const string Danish = "da";
    public const string Dutch = "nl";
    public const string Greek = "el";
    public const string Czech = "cs";
    public const string Hungarian = "hu";
    public const string Romanian = "ro";
    public const string Hebrew = "he";
    public const string Arabic = "ar";
    public const string Hindi = "hi";
    public const string Bengali = "bn";

    public static Dictionary<string, string> LanguageNames = new()
    {
        { "vi", "Vietnamese" },
        { "en", "English" },
        { "es", "Spanish" },
        { "fr", "French" },
        { "de", "German" },
        { "it", "Italian" },
        { "pt", "Portuguese" },
        { "ru", "Russian" },
        { "zh", "Chinese (Simplified)" },
        { "ja", "Japanese" },
        { "ko", "Korean" },
        { "th", "Thai" },
        { "id", "Indonesian" },
        { "fil", "Filipino" },
        { "ms", "Malay" },
        { "my", "Burmese" },
        { "km", "Khmer" },
        { "lo", "Lao" },
        { "tr", "Turkish" },
        { "pl", "Polish" },
        { "sv", "Swedish" },
        { "no", "Norwegian" },
        { "da", "Danish" },
        { "nl", "Dutch" },
        { "el", "Greek" },
        { "cs", "Czech" },
        { "hu", "Hungarian" },
        { "ro", "Romanian" },
        { "he", "Hebrew" },
        { "ar", "Arabic" },
        { "hi", "Hindi" },
        { "bn", "Bengali" }
    };

    public static readonly List<string> DefaultTargetLanguages = new()
    {
        "vi", "en", "es", "fr", "zh", "ja"
    };

    public static readonly List<string> SupportedLanguages = new()
    {
        "vi", "en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko", "th",
        "id", "fil", "ms", "my", "km", "lo", "tr", "pl", "sv", "no", "da", "nl",
        "el", "cs", "hu", "ro", "he", "ar", "hi", "bn"
    };

    public static bool IsSupportedLanguage(string langCode)
    {
        return SupportedLanguages.Contains(langCode.ToLower());
    }

    public static string GetLanguageName(string langCode)
    {
        return LanguageNames.TryGetValue(langCode.ToLower(), out var name) ? name : langCode;
    }
}
