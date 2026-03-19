# Python AI Microservice

This microservice provides AI-powered text processing capabilities using Flask:

- **Text Preprocessing** - Grammar fixing, entity detection (Ollama)
- **Translation** - Multilingual translation with entity preservation (Deep-Translator)
- **Text-to-Speech** - Audio generation (Piper TTS)
- **Speech-to-Text** - Audio transcription (Whisper)

## Prerequisites

- Python 3.9+
- Ollama (running on localhost:11434)
- Piper TTS (installed locally)
- FFmpeg (for audio conversion)

## Installation

### 1. Install Python Dependencies

```bash
cd Backend/PythonAPI
pip install -r requirements.txt
```

### 2. Install System Dependencies

#### Ubuntu/Debian

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Install Piper TTS
sudo apt-get install piper-tts

# Install FFmpeg
sudo apt-get install ffmpeg

# Install Whisper system dependencies
sudo apt-get install libsndfile1
```

#### macOS (Homebrew)

```bash
# Install Ollama
brew install ollama

# Install Piper TTS
brew install piper-tts

# Install FFmpeg
brew install ffmpeg
```

#### Windows

- Download and install [Ollama](https://ollama.ai)
- Download and install [Piper TTS](https://piper-tts.github.io/)
- Download and install [FFmpeg](https://ffmpeg.org/download.html)

### 3. Download Ollama Models

```bash
# Start Ollama service
ollama serve

# In another terminal, pull Vietnamese-optimized model
ollama pull llama2:13b
# Or use a smaller/faster model
ollama pull phi
```

### 4. Download Piper Voices

```bash
# Voices are downloaded on first use
# Or pre-download specific language packs
piper --update-voices
```

## Configuration

Copy `.env.example` to `.env` and update:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
PIPER_PATH=/usr/bin/piper
WHISPER_MODEL=base
PYTHON_API_PORT=5000
```

## Running the Service

### Development Mode

```bash
python main.py
```

The API will be available at `http://localhost:5000`

### Production Mode (with Gunicorn)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

### Docker

```bash
docker build -t vinh-ai-service .
docker run -p 5000:5000 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  vinh-ai-service
```

## API Endpoints

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-03-18T10:30:00.000000"
}
```

### Preprocess Text

```http
POST /api/preprocess
Content-Type: application/json

{
  "text": "Ông Sáu ở Vĩnh Khánh là một địa danh nổi tiếng",
  "language": "vi"
}
```

Response:

```json
{
  "success": true,
  "fixed_text": "Ông Sáu ở Vĩnh Khánh là một địa danh nổi tiếng",
  "entities": [
    {
      "original": "Ông Sáu",
      "type": "PERSON",
      "proper_name": "Ông Sáu"
    },
    {
      "original": "Vĩnh Khánh",
      "type": "LOCATION",
      "proper_name": "Vĩnh Khánh"
    }
  ]
}
```

### Translate Text

```http
POST /api/translate
Content-Type: application/json

{
  "text": "Ông Sáu ở Vĩnh Khánh",
  "from_lang": "vi",
  "to_lang": "en",
  "entity_mappings": {
    "Ông Sáu": "Mr Sáu",
    "Vĩnh Khánh": "Vinh Khanh"
  }
}
```

Response:

```json
{
  "success": true,
  "translated_text": "Mr Sáu at Vinh Khanh"
}
```

### Generate Audio

```http
POST /api/generate-audio
Content-Type: application/json

{
  "text": "Xin chào, đây là bản demo của hệ thống.",
  "language_code": "vi_VN"
}
```

Response: MP3 audio binary file

### Transcribe Audio

```http
POST /api/transcribe
Content-Type: multipart/form-data

- audio_file: [audio.mp3]
- language: vi
```

Response:

```json
{
  "success": true,
  "transcribed_text": "Xin chào, đây là bản demo của hệ thống."
}
```

## Monitoring & Logging

Logs are printed to console with timestamps. Check logs for:

- Service startup status
- API request details
- Error messages and tracebacks

## Performance Notes

### Memory Usage

- Ollama + Llama2: ~4-8 GB
- Whisper (base): ~1-2 GB
- Piper TTS: minimal (~100 MB)

### Response Times (approximate)

- Preprocess: 5-10 seconds (first call), 1-2s (cached)
- Translate: 2-5 seconds
- Generate Audio: 10-30 seconds (depending on text length)
- Transcribe: 5-20 seconds (depending on audio length)

### Optimization Tips

- Use smaller Ollama model if memory is limited (phi, neural-chat)
- Cache responses at .NET level
- Use smaller Whisper model if speed is critical (tiny ~1-3s)
- Run services on different machines for parallel processing

## Troubleshooting

### Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start Ollama
ollama serve
```

### Piper TTS not found

```bash
# Check installation
which piper

# If not found, install or update PATH
export PATH=$PATH:/usr/local/bin
```

### Audio generation issues

```bash
# Ensure FFmpeg is installed
ffmpeg -version

# Check Piper voices are downloaded
ls ~/.local/share/piper-tts/voices
```

### Memory issues

- Reduce Ollama model size
- Restart service after memory spikes
- Monitor with `top` or `nvidia-smi`

## Integration with .NET Backend

The .NET backend calls this API:

```csharp
// Example: .NET calling Python API
var client = new HttpClient();
var response = await client.PostAsJsonAsync(
    "http://localhost:5000/api/translate",
    new { text = "...", from_lang = "vi", to_lang = "en" }
);
```

See `Backend/WebApi.PoC/Services/*.cs` for full implementation.
