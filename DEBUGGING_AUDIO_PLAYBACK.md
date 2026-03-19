# 🔍 Audio Generation Debugging Guide

## Problem Statement

Phần UI xem nội dung đã sinh ra chưa có khả năng nghe audio, và dữ liệu chưa được lưu vào database.

## Root Causes Để Kiểm Tra

1. **MultilingualController không trả về audioUrl** (upload Cloudinary fail)
2. **Frontend không nhận audioUrl từ response**
3. **Audio playback bị fail do URL invalid hoặc CORS issue**
4. **POI database không lưu descriptionAudio**

---

## Step-by-Step Debugging Process

### Step 1: Verify Backend Response

#### 1a. Gọi API trực tiếp

```bash
# Test text mode
curl -X POST http://localhost:7047/api/multilingual/generate-from-text \
  -H "Content-Type: application/json" \
  -d '{
    "sourceText": "Ông Sáu ở Vĩnh Khánh",
    "sourceLanguage": "vi",
    "targetLanguages": ["en", "es"]
  }' | jq .
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "langCode": "en",
      "translatedText": "Mr Sáu at Vinh Khanh",
      "audioUrl": "https://res.cloudinary.com/your-cloud/video/upload/v../abc123.wav"
    },
    {
      "langCode": "es",
      "translatedText": "...",
      "audioUrl": "https://res.cloudinary.com/..."
    }
  ]
}
```

**What to check:**

- ✓ `success: true`
- ✓ `data` array có entries
- ✓ Mỗi item có `audioUrl` (không null/empty)
- ✓ audioUrl là valid Cloudinary URL

**If fails:**

- Check backend logs: `[ERR] Failed to upload audio for...`
- Verify Cloudinary credentials in `appsettings.json`
- Check Cloudinary quota/limits

---

#### 1b. Kiểm tra Backend Logs

```bash
# Nếu dùng Docker
docker logs vinh-dotnet-api | grep -A5 "Uploading audio"

# Nếu chạy local
# Mở Visual Studio Output window, xem "Debug" hoặc console output
```

**Expected logs:**

```
[INF] Uploading audio for en: poi_abc_en.wav (45678 bytes)
[INF] ✓ Successfully uploaded: en → https://res.cloudinary.com/...
[INF] Uploading audio for es: poi_abc_es.wav (52891 bytes)
[INF] ✓ Successfully uploaded: es → https://res.cloudinary.com/...
```

**If you see errors:**

```
[WRN] Audio stream is null for en
[WRN] Audio stream is empty for es
[ERR] Failed to upload audio for de: [exception]
```

---

### Step 2: Verify Frontend Receives audioUrl

#### 2a. Open Browser Console

1. **Open Admin Frontend**: http://localhost:5173
2. **Open DevTools**: F12 → Console tab
3. **Go to**: POI → Create POI
4. **Fill form** and click "Sinh nội dung đa ngôn ngữ"
5. **Watch Console** for these logs:

```javascript
// These should appear when generation completes:
=== MultilingualAPI Response (Text Mode) ===
{
  success: true,
  data: [
    { langCode: "en", translatedText: "...", audioUrl: "https://res.cloudinary.com/..." },
    { langCode: "es", translatedText: "...", audioUrl: "https://res.cloudinary.com/..." }
  ]
}

Setting generated content: [...]
=== GenerationResultReview.tsx ===
Total languages: 2
Full content received: [...]
[0] en: translatedText="..." audioUrl="https://..."
[1] es: translatedText="..." audioUrl="https://..."
```

**What to check:**

- ✓ Response shows `success: true`
- ✓ `audioUrl` is present in each item (not empty/null)
- ✓ audioUrl is valid HTTPS URL from Cloudinary

**If audioUrl is missing:**

- Check Network tab in DevTools (F12 → Network)
- Look for `/api/multilingual/generate-from-text` request
- Check response body - is audioUrl there?
- If yes in response but no in console log: frontend API issue

---

#### 2b. Kiểm tra Network Request/Response

1. **Open DevTools**: F12 → Network tab
2. **Click "Sinh nội dung"**
3. **Find request**: `/api/multilingual/generate-from-text`
4. **Click on it** → Response tab
5. **Verify response JSON:**

```json
{
  "success": true,
  "data": [
    { "langCode": "en", "translatedText": "...", "audioUrl": "https://..." }
  ]
}
```

**If audioUrl is null or missing:**

- Backend did not upload to Cloudinary successfully
- Go back to Step 1 to check Cloudinary upload

---

### Step 3: Verify Audio Playback

#### 3a. Audio URL Accessibility

```bash
# Test if Cloudinary URL is accessible
curl -I https://res.cloudinary.com/your-cloud/video/upload/v.../file.wav
# Should return: HTTP 200
```

#### 3b. Test in Browser

1. **Copy audioUrl** from console log
2. **Paste in new tab** or address bar
3. **Verify:** Audio downloads or plays in browser

**If fails:**

- CORS issue (audio plays but error in console)
- Cloudinary URL expired or deleted
- File not uploaded to Cloudinary

---

### Step 4: Verify Audio Preview in Review Modal

#### 4a. Review Modal Should Show

When generation completes:

1. **Review modal** opens with language tabs
2. **Click language tab** (e.g., "EN")
3. **See section "Audio:"**
4. **Button "▶ Nghe audio"** appears

**If Audio section missing:**

- Response doesn't have audioUrl for that language
- Go back to Step 2 - check network response

#### 4b. Click Play Button

1. **Click "▶ Nghe audio"**
2. **Console should show:**

```javascript
Playing audio: https://res.cloudinary.com/...
Audio playback ended
```

3. **You should hear:** Audio file playing

**If error instead:**

```javascript
No audio URL available for language: en
Full selected content: {langCode: "en", translatedText: "..., audioUrl: null}
```

→ This means audioUrl not in response. Go to Step 2.

**If different error:**

```javascript
Audio playback error: Error: NotSupportedError...
Failed to initiate audio playback: Error...
```

→ Cloudinary URL issue. Go to Step 3.

---

### Step 5: Verify Database Storage

#### 5a. After Clicking "Xác nhận & Lưu"

1. **Check console**: Should see:

```javascript
=== POI Create Payload ===
{
  poiName: "Test POI",
  localizedDataCount: 2,
  localizedData: [
    { langCode: "en", descriptionAudio: "https://res.cloudinary.com/..." },
    { langCode: "es", descriptionAudio: "https://res.cloudinary.com/..." }
  ]
}
```

2. **POI should be created** - you see "Đã tạo POI thành công."

#### 5b. Query Database

```sql
SELECT
  p.ID,
  p.Name,
  ld.LangCode,
  ld.Description,
  ld.DescriptionAudio
FROM POIs p
INNER JOIN LocalizedDatas ld ON p.ID = ld.PoiId
WHERE p.Name = 'Test POI'
ORDER BY p.CreatedAt DESC
```

**Expected result:**

```
ID      Name      LangCode  Description           DescriptionAudio
---     Test POI  en        Mr Sáu at Vinh Khanh  https://res.cloudinary.com/...
---     Test POI  es        Señor Sáu...          https://res.cloudinary.com/...
```

**If DescriptionAudio is empty/NULL:**

- Frontend sent empty string (audioUrl = "" or null)
- Go back to Step 4 - check what's in generatedContent

**If rows not exist:**

- POI save failed - check backend logs for errors

---

## Common Issues & Solutions

### Issue 1: audioUrl is null in response

**Symptom:** Console shows `audioUrl: null` in GenerationResultReview

**Causes & Solutions:**

1. **Cloudinary upload failed** → Check Cloudinary credentials, logs
2. **Audio stream was empty** → Check Python API, logs
3. **Path mismatch** → Verify LanguageCodeConstants language codes match

**To fix:**

1. Check backend logs for `[WRN] Audio stream is empty` or `[ERR] Failed to upload`
2. Verify Cloudinary in appsettings.json
3. Restart services and try again

---

### Issue 2: Audio plays but then stops

**Symptom:** Audio plays for 1-2 seconds then stops, button stays "⏸ Đang phát..."

**Causes:**

- Audio file is corrupted or incomplete
- Piper TTS generated bad audio

**To fix:**

1. Download audio file directly from Cloudinary URL
2. Try playing with VLC or other media player
3. Check Python API logs - look for Piper TTS errors

---

### Issue 3: CORS error in console

**Symptom:** Console shows `Access to audioUrl from origin 'http://localhost:5173' has been blocked by CORS policy`

**Cause:** Cloudinary CORS settings

**To fix:**

1. Verify Cloudinary URL is HTTPS not HTTP
2. Check Cloudinary dashboard CORS settings
3. Alternatively, proxy audio through backend API

---

### Issue 4: Database shows empty DescriptionAudio

**Symptom:** DB query shows NULL in DescriptionAudio column

**Causes:**

- Frontend sent empty string (audioUrl = "" or null)
- POI save happened before audio upload completed

**To fix:**

1. Check frontend console - does payload show audioUrl?
2. Verify POI save order: audio must upload before save
3. Check if frontend timeout killed request (see next issue)

---

### Issue 5: "Request timeout" error

**Symptom:** Frontend shows error "Request timeout after 600s"

**Cause:**

- Generation took >10 minutes
- Python API stuck/hung

**To fix:**

1. Check Python API logs - is it processing?
2. Increase timeout in `http.ts` line 66: `const timeout = isLongRunningRequest ? 900000 : 30000;`
3. Reduce number of languages being generated
4. Check system resources (CPU, memory)

---

## Debugging Checklist

Before testing, verify all prerequisites:

- [ ] Ollama running: `ollama serve` or `docker-compose up -d`
- [ ] Python API running: `python Backend/PythonAPI/main.py` or docker
- [ ] .NET API running: `dotnet run` or docker
- [ ] Frontend running: `npm run dev`
- [ ] Cloudinary credentials in `appsettings.json`
- [ ] Browser DevTools open (F12 → Console tab)

---

## Expected Behavior (Full Success Case)

### Text Input Mode

1. ✓ User enters text: "Ông Sáu ở Vĩnh Khánh"
2. ✓ Selects: English, Spanish, French
3. ✓ Clicks "Sinh nội dung đa ngôn ngữ"
4. ✓ Progress modal shows 0% → 100% (takes 2-3 min)
5. ✓ Review modal opens with 3 tabs
6. ✓ Click EN tab:
   - Text: "Mr Sáu at Vinh Khanh"
   - Audio button: "▶ Nghe audio"
   - Click play: Audio plays ✓
7. ✓ Click "Xác nhận & Lưu"
8. ✓ Toast shows "Đã tạo POI thành công"
9. ✓ Database has DescriptionAudio URLs
10. ✓ Audio URL still accessible from Cloudinary

### Audio Input Mode

1. ✓ User clicks "Upload MP3" mode
2. ✓ Uploads Vietnamese MP3 file
3. ✓ Selects English, Spanish, French
4. ✓ Clicks "Sinh nội dung đa ngôn ngữ"
5. ✓ Progress shows "STT" phase (Whisper transcription)
6. ✓ Same as Step 4-10 above

---

## Key Debug Commands

```bash
# Backend logs
docker logs -f vinh-dotnet-api

# Python API logs
docker logs -f vinh-python-api

# Test Cloudinary upload directly
curl -X POST https://api.cloudinary.com/v1_1/YOUR_CLOUD/video/upload \
  -F "file=@test.wav" \
  -F "api_key=YOUR_KEY" \
  -F "api_secret=YOUR_SECRET"

# Test audio playback from URL
ffplay "https://res.cloudinary.com/..."
```

---

## When Everything Works ✅

Once all tests pass:

1. Audio is generated in 5-7 minutes (first run, parallel)
2. Audio URLs stored in Cloudinary CDN
3. Frontend can preview/play audio
4. Database stores audio URLs
5. POI displays with audio in tour app

The system is **production-ready**! 🎉
