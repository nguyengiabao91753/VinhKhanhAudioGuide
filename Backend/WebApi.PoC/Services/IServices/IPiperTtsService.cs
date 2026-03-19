namespace WebApi.PoC.Services.IServices;

public interface IPiperTtsService
{
    /// <summary>
    /// Generate speech audio from text using Piper TTS
    /// </summary>
    Task<Stream> GenerateAudioAsync(
        string text,
        string languageCode,  // e.g., "en_US", "vi_VN"
        long? speakerId = null
    );
}
