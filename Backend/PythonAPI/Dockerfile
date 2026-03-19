FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Piper TTS
RUN curl -L https://github.com/rhasspy/piper/releases/download/2024.1.14/piper_linux_x86_64.tar.gz | tar xz -C /usr/local/bin
ENV PATH="/usr/local/bin/piper:$PATH"

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for Piper voices
RUN mkdir -p ~/.local/share/piper-tts/voices

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Expose port
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=main.py
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python", "main.py"]
