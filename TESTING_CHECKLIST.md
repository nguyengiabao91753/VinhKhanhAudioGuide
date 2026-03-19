# Integration Testing Checklist - Multilingual Audio Generation

## Pre-Flight Checks (Before Running Services)

### Environment Setup

- [ ] Ollama installed: `ollama --version`
- [ ] Python 3.9+ installed: `python --version`
- [ ] .NET SDK 8+: `dotnet --version`
- [ ] Docker and Docker Compose installed (or manual setup)

### Dependencies Installed

- [ ] Python API deps: `pip install -r Backend/PythonAPI/requirements.txt`
- [ ] Ollama model downloaded: `ollama pull llama2`
- [ ] Piper TTS installed: `pip show piper-tts`
- [ ] Whisper installed: `pip show openai-whisper`
- [ ] Cloudinary credentials in `appsettings.json`

---

## Service Startup Tests

### Method A: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Verify containers running
docker ps

# Expected: 3 containers - ollama, python-api, dotnet-api
```

Then go to **Integration Tests** section.

### Method B: Manual Startup (for debugging)

#### Terminal 1: Ollama

```bash
ollama serve
# Expected: "Listening on 127.0.0.1:11434"
```

#### Terminal 2: Python API

```bash
cd Backend/PythonAPI
python main.py
# Expected: "Running on http://0.0.0.0:5000"
```

#### Terminal 3: .NET API

```bash
cd Backend/WebApi.PoC
dotnet run
# Expected: "Now listening on: https://localhost:7047"
```

#### Terminal 4: Frontend

```bash
cd Presentation/AdminManage
npm run dev
# Expected: "Local: http://localhost:5173"
```

---

## Integration Tests

### Test 1: Python API Health Check

```bash
curl http://localhost:5000/api/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-03-19T10:30:00Z"
}
```

**If fails:** Check Python API logs - may need to install Piper/Whisper models

---

### Test 2: Ollama Preprocessing

```bash
curl -X POST http://localhost:5000/api/preprocess \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Ông Sáu ở Vĩnh Khánh",
    "language": "vi"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "fixed_text": "Ông Sáu ở Vĩnh Khánh",
  "entities": [
    {
      "original": "Ông Sáu",
      "type": "PERSON",
      "proper_name": "Mr Sáu"
    },
    {
      "original": "Vĩnh Khánh",
      "type": "LOCATION",
      "proper_name": "Vinh Khanh"
    }
  ]
}
```

**If fails:**

- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Check Python API logs for Ollama connection error

---

### Test 3: Translation Service

```bash
curl -X POST http://localhost:5000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Ông Sáu ở Vĩnh Khánh",
    "from_lang": "vi",
    "to_lang": "en",
    "entity_mappings": {
      "Ông Sáu": "Mr Sáu",
      "Vĩnh Khánh": "Vinh Khanh"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "translated_text": "Mr Sáu at Vinh Khanh"
}
```

**If fails:**

- Check deep-translator installed: `pip show deep-translator`
- Verify language codes are valid

---

### Test 4: Audio Generation (Piper TTS)

```bash
curl -X POST http://localhost:5000/api/generate-audio \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào",
    "language_code": "vi_VN"
  }' \
  --output test_audio.wav
```

**Expected Result:**

- File `test_audio.wav` created with audio data (not 0 bytes)
- Can play in audio player

**If fails:**

- Check Piper installed: `which piper` or `where piper.exe`
- Check voices downloaded: `ls ~/.local/share/piper/voices/`
- Verify PIPER_PATH environment variable if using custom location

---

### Test 5: Backend Multilingual Endpoint (Text)

```bash
curl -X POST http://localhost:7047/api/multilingual/generate-from-text \
  -H "Content-Type: application/json" \
  -d '{
    "sourceText": "Ông Sáu ở Vĩnh Khánh",
    "sourceLanguage": "vi",
    "targetLanguages": ["en", "es", "fr"]
  }' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq .
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "langCode": "en",
      "translatedText": "Mr Sáu at Vinh Khanh",
      "audioUrl": "https://res.cloudinary.com/..."
    },
    {
      "langCode": "es",
      "translatedText": "...",
      "audioUrl": "https://res.cloudinary.com/..."
    },
    {
      "langCode": "fr",
      "translatedText": "...",
      "audioUrl": "https://res.cloudinary.com/..."
    }
  ]
}
```

**If fails:**

- Check .NET API logs for specific error
- Verify Python API responding
- Verify Cloudinary credentials in appsettings.json

---

### Test 6: Frontend UI - Text Mode

1. **Open Admin Frontend**: http://localhost:5173
2. **Navigate to**: POI → Create POI
3. **Fill in basic fields**:
   - POI Name: "Test POI"
   - Address: "123 Main St"
   - Position: Use map or manual coords
4. **Generate Multilingual Content**:
   - Keep mode as "📝 Nhập text"
   - Enter text: "Ông Sáu ở Vĩnh Khánh"
   - Select languages: en, es, fr (click "Chọn tất cả" or select individually)
   - Click "🚀 Sinh nội dung đa ngôn ngữ"

**Expected Behavior:**

- ⏳ Progress modal appears showing "Đang sinh tạo nội dung đa ngôn ngữ..."
- Progress bar should increment (slowly - total 5-7 minutes for 6 languages)
- After completion: Review modal shows 3 language tabs
- Each tab has: translated text + play button for audio preview
- Audio preview should play without errors

**If fails:**

- Check Frontend Console (F12) for errors
- Check .NET API logs for exceptions
- Verify Python API has enough time to complete (check timeout settings)

---

### Test 7: Frontend UI - Audio Mode

1. **Open Admin Frontend**: http://localhost:5173
2. **Navigate to**: POI → Create POI (or reload to reset form)
3. **Fill in basic fields** (same as Test 6)
4. **Generate from Audio**:
   - Click mode toggle to "🎤 Upload MP3"
   - Upload an MP3 file (record Vietnamese speech if available)
   - Select languages: en, es, fr
   - Click "🚀 Sinh nội dung đa ngôn ngữ"

**Expected Behavior:**

- Progress modal with "Đang phiên âm audio..." then generation
- After STT completion, shows original Vietnamese text
- After generation, review modal shows translated versions
- User can play audio for each language

**If fails:**

- Check Whisper is working: `whisper --model base --out_format txt test.mp3`
- Check Python API logs for STT errors

---

### Test 8: Database Verification

After successfully submitting POI with multilingual generation:

```bash
# Connect to SQL Server
sqlcmd -S "." -d "VinhKhanhAudio" -U "sa"

# Query POI with audio URLs
SELECT
  ID,
  Name,
  LangCode,
  Description,
  DescriptionAudio
FROM LocalizedDatas
WHERE DescriptionAudio LIKE 'https://res.cloudinary.com%'
```

**Expected Result:**

- Rows with valid Cloudinary audio URLs
- URLs should be accessible (test with curl or browser)

---

### Test 9: Cloudinary Verification

Test audio URLs from database:

```bash
# Replace URL from database
curl -I https://res.cloudinary.com/your_cloud/video/upload/...

# Expected: HTTP 200
```

Or just click audio preview in Frontend review modal - it should play.

---

### Test 10: Edit POI with Language Regeneration

1. **Open existing POI** from Edit page
2. **Click "Regenerate ngôn ngữ"** button (if implemented)
3. **Do same flow as Test 6**
4. **Update POI**

**Expected Result:**

- Existing POI updated with new audio URLs
- Old audio files still in Cloudinary (not deleted - OK for now)

---

## Performance Verification

### Timeline Test

Run Test 6 and note the duration:

| Stage                        | Expected    | Actual | ✓/✗ |
| ---------------------------- | ----------- | ------ | --- |
| Ollama preprocessing         | 5-10s       |        |     |
| Translation (3 langs × 2-5s) | 6-15s       |        |     |
| TTS (3 langs × 10-30s)       | 30-90s      |        |     |
| Cloudinary upload (3 × 1-3s) | 3-9s        |        |     |
| **Total**                    | **44-124s** |        |     |

Note: First run slower due to model loading. Subsequent runs faster.

---

## Logging Verification

### Check .NET API Logs

Look for:

```
[INF] Generating multilingual content from text
[INF] Progress: 0/3 - Preprocessing text with Ollama...
[INF] Progress: 1/3 - Processing en...
[INF] Translating to en
[INF] Generating audio for en
[INF] Uploading audio for en: poi_abc123_en.wav (45678 bytes)
[INF] ✓ Successfully uploaded: en → https://res.cloudinary.com/...
[Similar for other languages]
```

If audio URL missing:

```
[WRN] Audio stream is null for es
[WRN] Audio stream is empty for fr
[ERR] Failed to upload audio for de: [exception details]
```

### Check Python API Logs

Look for:

```
INFO:__main__:Generating audio for en using voice en_US-amy-medium
INFO:__main__:Running Piper command: piper --model en_US-amy-medium --output-file /tmp/...wav
INFO:__main__:Audio generation successful (45678 bytes)
```

If Piper fails:

```
ERROR:__main__:Piper TTS executable not found: piper
ERROR:__main__:Piper output file not created
ERROR:__main__:Piper output file is empty
```

---

## Troubleshooting Guide

### Problem: "Request timeout" error in frontend

**Solution**: Increase timeout in `http.ts`

```typescript
const timeout = isLongRunningRequest ? 900000 : 30000; // 15 mins
```

### Problem: "Piper TTS not found"

**Solution**: Install Piper or set PATH

```bash
# macOS/Linux
brew install piper-tts
export PATH=$PATH:~/.local/bin

# Windows
set PIPER_PATH=C:\path\to\piper.exe
```

### Problem: "Ollama connection refused"

**Solution**: Start Ollama service

```bash
# macOS
brew services restart ollama

# Linux
sudo systemctl restart ollama

# Windows
ollama serve
```

### Problem: Audio preview doesn't play

**Solution**:

- Verify Cloudinary URL is valid: `curl -I https://res.cloudinary.com/...`
- Check browser console for CORS errors
- Verify audioUrl is not empty in Review modal

### Problem: Database query returns no results

**Solution**:

- Verify POI was actually saved (check POIs table)
- Verify DescriptionAudio column has Cloudinary URLs
- Check .NET logs for upload errors

---

## Final Acceptance Criteria

✅ All 10 tests pass
✅ Logs show expected sequences with no errors
✅ Audio files play from Cloudinary
✅ Database has correct audio URLs
✅ Edit/regenerate works
✅ Performance acceptable (< 10 min for 6 languages)

---

## Notes

- **First Run**: Services may take longer due to model downloads/loading
- **Caching**: Ollama results and translations are cached - second run much faster
- **Entity Preservation**: Verify proper nouns like "Ông Sáu" → "Mr Sáu" are correct
- **Audio Quality**: Piper should produce natural-sounding speech for all languages
- **Parallel Processing**: 3 languages processed simultaneously by default

---

## Quick Debug Commands

```bash
# Check all services health
curl http://localhost:5000/api/health
curl http://localhost:7047/api/health
curl http://localhost:11434/api/tags

# Check specific service
curl -X POST http://localhost:5000/api/preprocess -d '{"text":"test","language":"vi"}' -H "Content-Type: application/json"

# Tail .NET logs (if using docker)
docker logs -f vinh-dotnet-api

# Tail Python logs (if using docker)
docker logs -f vinh-python-api
```
