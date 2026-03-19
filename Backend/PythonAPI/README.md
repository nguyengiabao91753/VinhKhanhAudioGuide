# Python AI Microservice

This microservice provides AI-powered text processing capabilities using Flask:

- **Text Preprocessing** - Entity detection for Vietnamese proper nouns (rule-based)
- **Translation** - Multilingual translation with proper noun preservation (Deep-Translator + Google Translate)
- **Text-to-Speech** - Audio generation (Piper TTS)
- **Speech-to-Text** - Audio transcription (Whisper)

---

## Prerequisites

- Python **3.11** (required — 3.12+ not supported by openai-whisper)
- Ollama (running on localhost:11434)
- FFmpeg
- Git

---

## Installation (Windows)

### 1. Install Python 3.11

Download from: https://www.python.org/downloads/release/python-3119/

> ✅ Tick **"Add Python to PATH"** when installing.

Verify:

```cmd
python --version
# Python 3.11.x
```

### 2. Install Ollama

Download from: https://ollama.ai/download

After installing, Ollama runs automatically in the background. Verify:

```cmd
curl http://localhost:11434/api/tags
```

Pull the required model:

```cmd
ollama pull llama3.2
```

### 3. Install FFmpeg

1. Download from: https://github.com/BtbN/FFmpeg-Builds/releases → `ffmpeg-master-latest-win64-gpl.zip`
2. Extract and move folder to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to system PATH:
   - Search "Environment Variables" in Start Menu
   - System variables → Path → Edit → New → `C:\ffmpeg\bin`
4. Verify:

```cmd
ffmpeg -version
```

### 4. Create Virtual Environment

```cmd
cd Backend/PythonAPI
python -m venv myenv
myenv\Scripts\activate
```

> 💡 Every time you open a new terminal, run `myenv\Scripts\activate` before starting the server.

### 5. Install Python Dependencies

```cmd
pip install -r requirements.txt
```

If `pip` is not recognized, use:

```cmd
python -m pip install -r requirements.txt
```

### 6. Download Piper TTS Voices

Run the voice downloader script (downloads all supported language voices, ~1.5GB):

```cmd
python download_voices.py
```

Voices are saved to `C:\Users\<username>\.local\share\piper\voices`.

> ✅ Voices already downloaded will be skipped automatically on re-run.

---

## Installation (Ubuntu/Debian)

```bash
# Python 3.11
sudo apt-get install python3.11 python3.11-venv

# Ollama
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2

# System dependencies
sudo apt-get install ffmpeg libsndfile1

# Virtual environment
cd Backend/PythonAPI
python3.11 -m venv myenv
source myenv/bin/activate

# Python packages
pip install -r requirements.txt

# Piper voices
python download_voices.py
```

---

## Installation (macOS)

```bash
# Ollama
brew install ollama
ollama pull llama3.2

# FFmpeg
brew install ffmpeg

# Virtual environment
cd Backend/PythonAPI
python3.11 -m venv myenv
source myenv/bin/activate

# Python packages
pip install -r requirements.txt

# Piper voices
python download_voices.py
```

---

## Configuration

Copy `.env.example` to `.env`:

```cmd
copy .env.example .env
```

Update `.env` with your settings:

```env
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
PYTHON_API_HOST=0.0.0.0
PYTHON_API_PORT=5000

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Piper TTS Configuration
PIPER_PATH=piper
PIPER_VOICES_PATH=C:\Users\<your-username>\.local\share\piper\voices

# Whisper STT Configuration
WHISPER_MODEL=base

# Logging
LOG_LEVEL=INFO
```

> ⚠️ Replace `<your-username>` with your actual Windows username.
> On Linux/macOS: `PIPER_VOICES_PATH=~/.local/share/piper/voices`

---

## Running the Service

### Development Mode

Make sure Ollama is running, then:

```cmd
myenv\Scripts\activate
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

---

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

---

## Troubleshooting

### `pip` not recognized

```cmd
python -m pip install -r requirements.txt
```

### Ollama 404 error

Model chưa được pull hoặc sai tên. Kiểm tra:

```cmd
ollama list
```

Đảm bảo `OLLAMA_MODEL` trong `.env` khớp với tên model trong danh sách.

### Piper voice not found

```
ValueError: Unable to find voice: xxx
```

Chạy lại `python download_voices.py` để tải voices còn thiếu.

### Audio đọc sai tiếng Việt

Đảm bảo file `vi_VN-25hours_single-neon.onnx` đã có trong thư mục voices.

### `No module named 'pkg_resources'`

```cmd
python -m pip install --upgrade pip setuptools wheel
```

### FFmpeg not found

Kiểm tra PATH đã có `C:\ffmpeg\bin` chưa. Mở CMD mới sau khi thêm PATH.

### Memory issues

- Dùng model nhỏ hơn: `ollama pull phi`
- Đổi `WHISPER_MODEL=tiny` trong `.env`

---

## Performance Notes

| Service          | RAM     | Response Time |
| ---------------- | ------- | ------------- |
| Whisper (base)   | ~1-2 GB | 5-20s         |
| Piper TTS        | ~100 MB | 1-5s          |
| Google Translate | minimal | 1-3s          |

---

## Integration with .NET Backend

```csharp
var client = new HttpClient();
var response = await client.PostAsJsonAsync(
    "http://localhost:5000/api/translate",
    new { text = "...", from_lang = "vi", to_lang = "en" }
);
```

See `Backend/WebApi.PoC/Services/*.cs` for full implementation.
