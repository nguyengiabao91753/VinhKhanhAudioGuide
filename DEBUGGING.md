# Debugging Guide - Multilingual Generation Issues

## Issue: "File not found" error when submitting multilingual content

### Root Causes Fixed

✅ **1. Windows `/dev/stdout` Path Issue (CRITICAL)**

- **Problem**: Piper TTS used `/dev/stdout` which doesn't exist on Windows
- **Fix**: Changed to temp file approach + read/delete
- **File**: `Backend/PythonAPI/services/tts_service.py`

✅ **2. Stream Position Not Reset**

- **Problem**: Audio stream position at end, Cloudinary couldn't read
- **Fix**: Added `stream.Seek(0, SeekOrigin.Begin)` before upload
- **File**: `Backend/WebApi.PoC/Services/CloudinaryService.cs`

✅ **3. Missing Stream Validation**

- **Problem**: Null or empty streams sent to Cloudinary
- **Fix**: Added null/empty checks + logging before upload
- **File**: `Backend/WebApi.PoC/Controllers/MultilingualController.cs`

✅ **4. Missing ResourceType Parameter**

- **Problem**: Cloudinary didn't know it was audio
- **Fix**: Added `ResourceType = "video"` to RawUploadParams
- **File**: `Backend/WebApi.PoC/Services/CloudinaryService.cs`

---

## How to Debug If Issues Persist

### Check Python API Logs

```bash
# Terminal window running Python API
# You should see:
INFO:__main__:Generating audio for en using voice en_US-amy-medium
INFO:__main__:Running Piper command: piper --model en_US-amy-medium --output-file C:\Temp\...wav
INFO:__main__:Audio generation successful (45678 bytes)

# If you see errors:
ERROR:__main__:Piper TTS executable not found: piper
# → Install Piper or add to PATH

ERROR:__main__:Piper output file not created: C:\Temp\...wav
# → Piper subprocess failed, check stderr message above

ERROR:__main__:Piper output file is empty
# → Piper ran but didn't generate audio
```

### Check .NET Backend Logs

```
[INF] Uploading audio for en: poi_abc123_en.wav (45678 bytes)
[INF] ✓ Successfully uploaded: en → https://res.cloudinary.com/...

[WRN] Audio stream is null for es
# → Python API returned null for transcription/audio

[WRN] Audio stream is empty for fr
# → Stream exists but has no data

[ERR] Failed to upload audio for de
# → Cloudinary upload failed, check inner exception
```

### Test Individual Endpoints

#### 1. Test Python API Health

```bash
curl http://localhost:5000/api/health
# Expected: { "status": "healthy", "timestamp": "..." }
```

#### 2. Test Preprocessing

```bash
curl -X POST http://localhost:5000/api/preprocess \
  -H "Content-Type: application/json" \
  -d '{"text": "Ông Sáu ở Vĩnh Khánh", "language": "vi"}'

# Expected:
#{
#  "success": true,
#  "fixed_text": "Ông Sáu ở Vĩnh Khánh",
#  "entities": [...]
#}
```

#### 3. Test Translation

```bash
curl -X POST http://localhost:5000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Ông Sáu ở Vĩnh Khánh",
    "from_lang": "vi",
    "to_lang": "en",
    "entity_mappings": {"Ông Sáu": "Mr Sáu"}
  }'

# Expected:
#{
#  "success": true,
#  "translated_text": "Mr Sáu at Vinh Khanh"
#}
```

#### 4. Test Audio Generation

```bash
curl -X POST http://localhost:5000/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"text": "Xin chào", "language_code": "vi_VN"}' \
  --output test_audio.wav

# Should create test_audio.wav file with audio data
# If file is 0 bytes or doesn't exist → Piper issue
```

---

## Checklist Before Production

- [ ] Piper TTS installed: `which piper` or `where piper`
- [ ] Piper voices downloaded: `ls ~/.local/share/piper-tts/voices/`
- [ ] Ollama running: `curl http://localhost:11434/api/tags`
- [ ] Ollama model downloaded: `ollama list`
- [ ] Deep-translator installed: `pip list | grep deep-translator`
- [ ] Whisper installed: `pip list | grep whisper`
- [ ] Python API running: `curl http://localhost:5000/api/health`
- [ ] .NET Backend can reach Python API (check appsettings.json)
- [ ] Cloudinary credentials valid and in appsettings.json

---

## Performance Notes

| Operation                 | Expected Time   | Notes                                       |
| ------------------------- | --------------- | ------------------------------------------- |
| Ollama preprocessing      | 5-10s           | First call, cached after                    |
| Translation               | 2-5s            | Per language, cached                        |
| Piper TTS                 | 10-30s          | Depends on text length                      |
| Cloudinary upload         | 1-3s            | Per file, depends on network                |
| **Total for 6 languages** | **5-7 minutes** | Parallel processing (3 languages at a time) |

### Optimize for Speed

```csharp
// In MultilingualGeneratorService
var semaphore = new SemaphoreSlim(3);  // Increase to 5 or more if server can handle
```

---

## Common Errors & Solutions

### Error: "Piper TTS not found"

```bash
# Windows: Add Piper to PATH
# Or set environment variable:
PIPER_PATH=C:\path\to\piper.exe

# Or update .env:
PIPER_PATH=C:/path/to/piper
```

### Error: "Model not found for language"

```python
# Check _get_voice_model() in tts_service.py
# Make sure language mapping exists
# Default fallback: en_US-amy-medium
```

### Error: "Stream position at end"

```
# ALREADY FIXED in CloudinaryService.cs
# Added: audioStream.Seek(0, SeekOrigin.Begin)
```

### Error: "Cloudinary auth failed"

```json
// Check appsettings.json:
{
  "CloudinarySettings": {
    "CloudName": "your_cloud_name", // NOT dvirdbmqy (demo account)
    "ApiKey": "your_actual_api_key", // NOT from source code
    "ApiSecret": "your_actual_secret" // NOT from source code
  }
}
```

---

## See Also

- **Python API README**: `Backend/PythonAPI/README.md`
- **Deployment Guide**: `DEPLOYMENT.md`
- **Architecture**: Main README.md
