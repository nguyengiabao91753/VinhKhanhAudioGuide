from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import logging
from datetime import datetime

# Modules
from services.ollama_service import OllamaService
from services.translation_service import TranslationService
from services.tts_service import TTSService
from services.stt_service import STTService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize services
ollama_service = OllamaService()
translation_service = TranslationService()
tts_service = TTSService()
stt_service = STTService()


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@app.route('/api/preprocess', methods=['POST'])
def preprocess_text():
    """
    Preprocess text: fix grammar, identify entities
    Request body:
    {
        "text": "string",
        "language": "vi" (optional, default: vi)
    }
    Response:
    {
        "success": bool,
        "fixed_text": "string",
        "entities": [
            {"original": "string", "type": "string", "proper_name": "string"}
        ]
    }
    """
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        language = data.get('language', 'vi')

        if not text:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400

        logger.info(f"Preprocessing text in {language}")
        result = ollama_service.preprocess(text, language)

        return jsonify({
            'success': True,
            'fixed_text': result['fixed_text'],
            'entities': result['entities']
        }), 200

    except Exception as e:
        logger.error(f"Error preprocessing text: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/translate', methods=['POST'])
def translate_text():
    """
    Translate text to target language
    Request body:
    {
        "text": "string",
        "from_lang": "vi",
        "to_lang": "en",
        "entity_mappings": {"Ông Sáu": "Mr Sáu"} (optional)
    }
    Response:
    {
        "success": bool,
        "translated_text": "string"
    }
    """
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        from_lang = data.get('from_lang', 'vi')
        to_lang = data.get('to_lang', 'en')
        entity_mappings = data.get('entity_mappings', {})

        if not text:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400

        logger.info(f"Translating from {from_lang} to {to_lang}")
        translated = translation_service.translate(text, from_lang, to_lang, entity_mappings)

        return jsonify({
            'success': True,
            'translated_text': translated
        }), 200

    except Exception as e:
        logger.error(f"Error translating text: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/generate-audio', methods=['POST'])
def generate_audio():
    """
    Generate audio from text using Piper TTS
    Request body:
    {
        "text": "string",
        "language_code": "en_US"
    }
    Response: Binary MP3 file
    """
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        language_code = data.get('language_code', 'en_US')

        if not text:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400

        logger.info(f"Generating audio for {language_code}")
        audio_bytes = tts_service.generate(text, language_code)

        if audio_bytes is None:
            return jsonify({
                'success': False,
                'error': 'Failed to generate audio'
            }), 500

        return audio_bytes, 200, {'Content-Type': 'audio/mpeg', 'Content-Disposition': 'attachment; filename="audio.mp3"'}

    except Exception as e:
        logger.error(f"Error generating audio: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe audio file to text using Whisper
    Request: multipart/form-data with audio file
    - audio_file: file (MP3, WAV, etc.)
    - language: string (optional, default: vi)
    Response:
    {
        "success": bool,
        "transcribed_text": "string"
    }
    """
    try:
        if 'audio_file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'audio_file is required'
            }), 400

        audio_file = request.files['audio_file']
        language = request.form.get('language', 'vi')

        if audio_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Audio file is empty'
            }), 400

        logger.info(f"Transcribing audio in {language}")
        transcribed = stt_service.transcribe(audio_file, language)

        return jsonify({
            'success': True,
            'transcribed_text': transcribed
        }), 200

    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    port = int(os.getenv('PYTHON_API_PORT', 5000))
    debug = os.getenv('PYTHON_API_DEBUG', 'False') == 'True'
    host = os.getenv('PYTHON_API_HOST', '0.0.0.0')

    logger.info(f"Starting Python API microservice on {host}:{port}")
    app.run(host=host, port=port, debug=debug)
