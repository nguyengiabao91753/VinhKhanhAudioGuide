# Microservices Deployment Guide

## Architecture

```
Frontend (React Admin)
    ↓
.NET Backend API (WebApi.PoC)
    ↓
Python AI Microservice (Flask)
    ├─ Ollama (Text preprocessing)
    ├─ Deep-Translator (Translation)
    ├─ Piper TTS (Audio generation)
    └─ Whisper (Audio transcription)
    ↓
Cloudinary (Asset storage)
Database (SQL Server)
```

## Quick Start with Docker Compose

### 1. Prerequisites

- Docker & Docker Compose installed
- Cloudinary credentials (API key, secret)

### 2. Setup Environment

Create `.env` file in project root:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Build and Run All Services

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f python-api
docker-compose logs -f dotnet-api
docker-compose logs -f ollama
```

### 4. Verify Services

```bash
# Check Python API health
curl http://localhost:5000/api/health

# Check .NET API is running
curl https://localhost:7047/api/pois --insecure

# Check Ollama
curl http://localhost:11434/api/tags
```

### 5. Stop Services

```bash
docker-compose down

# With volume cleanup
docker-compose down -v
```

---

## Manual Installation (Development)

### 1. Setup Python Microservice

```bash
cd Backend/PythonAPI

# Create virtual environment
python -m venv venv

# Activate venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure .env
cp .env.example .env
# Edit .env with your settings

# Run the service
python main.py
```

Service will be available at: `http://localhost:5000`

### 2. Setup Ollama (required for Python API)

```bash
# Install Ollama from https://ollama.ai

# Start Ollama service
ollama serve

# In another terminal, download a model
ollama pull llama2
# Or smaller/faster model:
ollama pull phi
```

### 3. Setup .NET Backend

```bash
cd Backend/WebApi.PoC

# Update appsettings.json with Python API URL
# "PythonAPI": { "BaseUrl": "http://localhost:5000" }

# Run with .NET CLI
dotnet run

# Or in Visual Studio: F5
```

Backend will be available at: `https://localhost:7047`

### 4. Setup Frontend

```bash
cd Presentation/AdminManage

npm install
npm run dev
```

Frontend will be available at: `http://localhost:5173` (or shown in console)

---

## Service Communication Flow

### Example: Creating POI with Multilingual Content

```
1. Frontend (React)
   POST /multilingual/generate-from-text
   {
     sourceText: "Ông Sáu ở Vĩnh Khánh...",
     sourceLanguage: "vi",
     targetLanguages: ["en", "es", "fr"]
   }
   ↓

2. .NET Backend (WebApi.PoC)
   POST /api/multilingual/generate-from-text
   ↓

3. Python Microservice
   a) Call /api/preprocess
      - Ollama: Fix grammar, identify entities
      ↓
   b) For each target language, call:
      - /api/translate → Deep-Translator
      - /api/generate-audio → Piper TTS
      ↓

4. Python returns:
   {
     data: [
       { langCode: "en", translatedText: "...", audioUrl: null },
       { langCode: "es", translatedText: "...", audioUrl: null },
       ...
     ]
   }
   ↓

5. .NET Backend
   - Receive audio streams
   - Upload to Cloudinary
   - Get URLs back
   ↓

6. .NET saves POI to DB with audio URLs
   ↓

7. Frontend displays review modal with audio preview
   ↓

8. User confirms → POI saved
```

---

## Configuration Files

### Backend (appsettings.json)

```json
{
  "PythonAPI": {
    "BaseUrl": "http://localhost:5000"
  },
  "CloudinarySettings": {
    "CloudName": "your_cloud_name",
    "ApiKey": "your_api_key",
    "ApiSecret": "your_api_secret"
  }
}
```

### Python API (.env)

```
PYTHON_API_HOST=0.0.0.0
PYTHON_API_PORT=5000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
WHISPER_MODEL=base
PIPER_PATH=/usr/bin/piper
```

---

## Performance Monitoring

### Check Service Status

```bash
# Python API health
curl http://localhost:5000/api/health

# Check running processes
ps aux | grep python
ps aux | grep ollama

# Monitor resource usage
docker stats
top
```

### View Logs

```bash
# Python API logs
tail -f /var/log/python-api.log

# Docker logs
docker-compose logs -f python-api

# .NET Backend logs
See application output in Visual Studio / terminal
```

### Performance Tips

1. **Memory**: Ollama + models require 4-8 GB
2. **CPU**: Use CPU-optimized models: `phi` (2.7B) instead of `llama2` (7B)
3. **Latency**: Run microservices on same network
4. **Caching**: Translation results are cached, Ollama responses cached
5. **Parallel**: Can process 3 languages simultaneously

---

## Troubleshooting

### Python API won't start

```bash
# Check if port is in use
lsof -i :5000

# Check Python version
python --version  # Should be 3.9+

# Check dependencies
pip list | grep -E 'Flask|requests|whisper'

# Run with verbose logging
PYTHONUNBUFFERED=1 python main.py
```

### Ollama connection issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
# Kill any ollama processes
pkill ollama
# Start again
ollama serve

# Check model exists
ollama list
```

### Audio generation fails

```bash
# Check Piper installation
which piper
piper --help

# Check voices available
ls -la ~/.local/share/piper-tts/voices

# Download voices
piper --update-voices
```

### Database connection issues

```bash
# Check SQL Server is running
# Windows: Services → Look for "SQL Server"
# Linux: systemctl status mssql-server

# Update connection string in appsettings.json
```

---

## Scaling (Production)

### Horizontal Scaling

Run multiple Python API instances behind a load balancer:

```bash
# Run 3 instances on different ports
gunicorn -w 4 -b 0.0.0.0:5000 main:app
gunicorn -w 4 -b 0.0.0.0:5001 main:app
gunicorn -w 4 -b 0.0.0.0:5002 main:app

# Use Nginx as reverse proxy
```

### Kubernetes Deployment

```yaml
# python-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: python-api
  template:
    metadata:
      labels:
        app: python-api
    spec:
      containers:
        - name: python-api
          image: vinh-python-api:latest
          ports:
            - containerPort: 5000
          env:
            - name: OLLAMA_BASE_URL
              value: http://ollama-service:11434
```

---

## Deployment Checklist

- [ ] Python API service running and responding to health check
- [ ] Ollama service is running and models are downloaded
- [ ] .NET Backend can reach Python API
- [ ] .NET Backend can reach database
- [ ] Frontend can reach .NET API
- [ ] Cloudinary credentials are valid
- [ ] All services have proper CORS configuration
- [ ] Logging is enabled and monitored
- [ ] Database backups are configured
- [ ] Service monitoring/alerting is setup

---

## Support

For issues or questions:

1. Check logs: `docker-compose logs -f`
2. Verify configuration in key `.env` and `appsettings.json` files
3. Test individual endpoints with curl
4. Check port availability: `lsof -i :<port>`
