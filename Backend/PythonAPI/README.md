
# FFmpeg
brew install ffmpeg

# Virtual environment
cd Backend/PythonAPI
python3.11 -m venv myenv
source myenv/bin/activate

# Python packages
pip install -r requirements.txt

python main.py
```

The API will be available at `http://localhost:5000`

Verify:

```cmd
curl http://localhost:5000/api/health
```

Expected response:

```json
{ "status": "healthy", "timestamp": "..." }
```

### Production Mode (with Gunicorn — Linux/macOS only)


## Supported Languages

| Code | Language   | TTS Voice                 |
| ---- | ---------- | ------------------------- |
| vi   | Tiếng Việt | vi_VN-25hours_single-neon |
| en   | English    | en_US-amy-medium          |
| fr   | Français   | fr_FR-siwis-medium        |
| zh   | 中文       | zh_CN-huayan-medium       |
| ja   | 日本語     | ja_JP-kokoro-medium       |
| ko   | 한국어     | ko_KR-kss-medium          |
| es   | Español    | es_ES-carlfm-x-low        |
| de   | Deutsch    | de_DE-bernd-medium        |
| it   | Italiano   | it_IT-adele-x-low         |
| pt   | Português  | pt_PT-tugao-medium        |
| ru   | Русский    | ru_RU-irinia-medium       |
| th   | ภาษาไทย    | th_TH-acharan-medium      |
| pl   | Polski     | pl_PL-darkman-medium      |
| nl   | Nederlands | nl_NL-mls_5809-low        |
| hu   | Magyar     | hu_HU-imre-medium         |
| ro   | Română     | ro_RO-mihai-medium        |
| tr   | Türkçe     | tr_TR-dfki-medium         |
| el   | Ελληνικά   | el_GR-rapunzelina-low     |
| cs   | Čeština    | cs_CZ-jirka-medium        |
| sv   | Svenska    | sv_SE-nst-medium          |
| ar   | العربية    | ar_JO-kareem-medium       |
| hi   | हिन्दी     | hi_IN-sangita-x-low       |

---

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
      "original": "ông Sáu",
      "type": "PERSON",
      "proper_name": "ông Sáu",
      "english_pronunciation": "Mr Sau"
    },
    {
      "original": "Vĩnh Khánh",
      "type": "LOCATION",
      "proper_name": "Vĩnh Khánh",
      "english_pronunciation": "Vinh Khanh"
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
    "ông Sáu": "Mr Sau",
    "Vĩnh Khánh": "Vinh Khanh"
  }
}
```

Response:

```json
{
  "success": true,
  "translated_text": "Mr Sau at Vinh Khanh"
}
```

### Generate Audio

```http
POST /api/generate-audio
Content-Type: application/json

{
  "text": "Hello, this is a demo.",
  "language_code": "en"
}
```

Response: WAV audio binary

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


```csharp
var client = new HttpClient();
var response = await client.PostAsJsonAsync(
    "http://localhost:5000/api/translate",
    new { text = "...", from_lang = "vi", to_lang = "en" }
);
```

See `Backend/WebApi.PoC/Services/*.cs` for full implementation.
