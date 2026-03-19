namespace WebApi.PoC.Services.IServices;

public interface ISpeechToTextService
{
    /// <summary>
    /// Transcribe audio file to text (MP3 → text)
    /// </summary>
    Task<string> TranscribeAsync(IFormFile audioFile, string language = "vi");
}
