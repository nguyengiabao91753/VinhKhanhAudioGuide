"""
main.py v3 — No Ollama, No Piper
Stack: Flask + deep-translator (Google) + edge-tts (Microsoft Neural)
"""
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os, logging
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from services.tts_service         import TTSService
from services.translation_service import TranslationService, _same, _norm
from services.entity_service      import EntityService
from services.stt_service         import STTService  # unchanged

logging.basicConfig(level=logging.INFO,
    format='%(asctime)s %(name)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

tts_service         = TTSService()
translation_service = TranslationService()
entity_service      = EntityService()
stt_service         = STTService()


# ── Health ────────────────────────────────────────────────────────────────

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy',
                    'timestamp': datetime.utcnow().isoformat(),
                    'backend': 'edge-tts + google-translate'}), 200


# ── Preprocess (entity extraction, no Ollama) ─────────────────────────────

@app.route('/api/preprocess', methods=['POST'])
def preprocess_text():
    """
    Extract proper nouns from text (rule-based, instant).
    Body: {"text":"...", "language":"vi"}
    """
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        lang = data.get('language', 'vi')
        if not text:
            return jsonify({'success': False, 'error': 'text required'}), 400
        result = entity_service.preprocess(text, lang)
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        logger.error("preprocess: %s", e, exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Translate ─────────────────────────────────────────────────────────────

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """
    Body: {"text":"...", "from_lang":"vi", "to_lang":"en", "entity_mappings":{}}
    Returns original text unchanged if from_lang == to_lang.
    """
    try:
        data            = request.get_json() or {}
        text            = data.get('text', '').strip()
        from_lang       = data.get('from_lang', 'vi')
        to_lang         = data.get('to_lang', 'en')
        entity_mappings = data.get('entity_mappings') or {}
        if not text:
            return jsonify({'success': False, 'error': 'text required'}), 400
        translated = translation_service.translate(text, from_lang, to_lang, entity_mappings)
        return jsonify({'success': True, 'translated_text': translated}), 200
    except Exception as e:
        logger.error("translate: %s", e, exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Pipeline ──────────────────────────────────────────────────────────────

@app.route('/api/pipeline', methods=['POST'])
def pipeline():
    """
    All-in-one: extract entities → translate → return text ready for TTS.
    Body:
      { "text":"...", "source_language":"vi", "target_language":"en" }
    Response:
      { "fixed_text":"...", "translated_text":"...", "entities":[...],
        "tts_language":"en" }
    """
    try:
        data            = request.get_json() or {}
        text            = data.get('text', '').strip()
        source_language = data.get('source_language', 'vi')
        target_language = data.get('target_language', 'en')
        if not text:
            return jsonify({'success': False, 'error': 'text required'}), 400

        prep     = entity_service.preprocess(text, source_language)
        fixed    = prep['fixed_text']
        entities = prep['entities']

        translated = (
            fixed if _same(source_language, target_language)
            else translation_service.translate_with_entities(
                    fixed, source_language, target_language, entities)
        )

        return jsonify({
            'success':         True,
            'fixed_text':      fixed,
            'translated_text': translated,
            'entities':        entities,
            'tts_language':    target_language,
        }), 200
    except Exception as e:
        logger.error("pipeline: %s", e, exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Generate audio ────────────────────────────────────────────────────────

@app.route('/api/generate-audio', methods=['POST'])
def generate_audio():
    """
    Body:
      { "text": "...",
        "language_code": "vi",          ← Piper-style OR just "vi"/"en" etc.
        "source_language": "vi",         ← language of input text (default: "vi")
        "skip_translation": false,       ← true = text already in target language
        "entities": [],                  ← from /api/preprocess (optional)
        "gender": "female"               ← "female" or "male" (optional)
      }

    Pipeline:
      1. If source != target → translate (with entity protection)
      2. Run edge-tts with the correct Neural voice
      3. Return MP3 bytes
    """
    try:
        data             = request.get_json() or {}
        text             = data.get('text', '').strip()
        language_code    = data.get('language_code', 'en')
        source_language  = data.get('source_language', 'vi')
        skip_translation = bool(data.get('skip_translation', False))
        entities         = data.get('entities') or []
        gender           = data.get('gender', 'female')

        if not text:
            return jsonify({'success': False, 'error': 'text required'}), 400

        tts_text = text

        if not skip_translation and not _same(source_language, language_code):
            logger.info("[audio] translating %s→%s", source_language, language_code)
            tts_text = translation_service.translate_with_entities(
                text, source_language, language_code, entities)
        else:
            logger.info("[audio] no translation (%s==%s or skip)",
                        source_language, language_code)

        audio = tts_service.generate(tts_text, language_code, gender)
        if audio is None:
            return jsonify({'success': False, 'error': 'TTS generation failed'}), 500

        # Detect if edge-tts returned MP3 (it always does)
        content_type = 'audio/mpeg'
        return Response(audio, status=200, mimetype=content_type,
                        headers={'Content-Disposition': 'attachment; filename="audio.mp3"'})

    except Exception as e:
        logger.error("generate-audio: %s", e, exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Transcribe ────────────────────────────────────────────────────────────

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    try:
        if 'audio_file' not in request.files:
            return jsonify({'success': False, 'error': 'audio_file required'}), 400
        audio_file = request.files['audio_file']
        language   = request.form.get('language', 'vi')
        if audio_file.filename == '':
            return jsonify({'success': False, 'error': 'empty file'}), 400
        text = stt_service.transcribe(audio_file, language)
        return jsonify({'success': True, 'transcribed_text': text}), 200
    except Exception as e:
        logger.error("transcribe: %s", e, exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


# ── Voices list ───────────────────────────────────────────────────────────

@app.route('/api/voices', methods=['GET'])
def list_voices():
    """List available edge-tts voices (requires internet)."""
    lang = request.args.get('language', '')
    voices = tts_service.list_voices()
    if lang:
        voices = [v for v in voices if lang.lower() in v.get('Locale', '').lower()]
    return jsonify({'success': True, 'voices': voices}), 200


@app.errorhandler(404)
def not_found(_): return jsonify({'success': False, 'error': 'not found'}), 404

@app.errorhandler(500)
def server_error(_): return jsonify({'success': False, 'error': 'server error'}), 500


if __name__ == '__main__':
    port  = int(os.getenv('PYTHON_API_PORT', 5000))
    debug = os.getenv('PYTHON_API_DEBUG', 'False') == 'True'
    host  = os.getenv('PYTHON_API_HOST', '0.0.0.0')
    logger.info("Starting on %s:%d (edge-tts + google-translate)", host, port)
    app.run(host=host, port=port, debug=debug)