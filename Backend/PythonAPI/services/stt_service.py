import whisper
import logging
import os
import tempfile

logger = logging.getLogger(__name__)


class STTService:
    def __init__(self):
        self.model_name = os.getenv('WHISPER_MODEL', 'base')
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load Whisper model on startup"""
        try:
            logger.info(f"Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(self.model_name)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            self.model = None

    def transcribe(self, audio_file, language: str = 'vi') -> str:
        """
        Transcribe audio file to text using Whisper
        """
        if self.model is None:
            logger.error("Whisper model not loaded")
            return ""

        # Get Whisper language name from our language code
        whisper_lang = self._get_whisper_language(language)

        try:
            # Save uploaded file to temp location
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp:
                audio_file.save(tmp.name)
                temp_path = tmp.name

            logger.info(f"Transcribing audio in {whisper_lang}")

            # Transcribe with Whisper
            result = self.model.transcribe(
                temp_path,
                language=whisper_lang,
                verbose=False
            )

            transcribed_text = result.get('text', '').strip()

            logger.info("Transcription successful")

            # Clean up temp file
            os.unlink(temp_path)

            return transcribed_text

        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            return ""

    def _get_whisper_language(self, lang_code: str) -> str:
        """
        Get Whisper language code from our language code
        Whisper uses English language names
        """
        mapping = {
            'vi': 'Vietnamese',
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'th': 'Thai',
            'id': 'Indonesian',
            'fil': 'Tagalog',
            'ms': 'Malay',
            'my': 'Burmese',
            'km': 'Khmer',
            'lo': 'Lao',
            'tr': 'Turkish',
            'pl': 'Polish',
            'sv': 'Swedish',
            'no': 'Norwegian',
            'da': 'Danish',
            'nl': 'Dutch',
            'el': 'Greek',
            'cs': 'Czech',
            'hu': 'Hungarian',
            'ro': 'Romanian',
            'he': 'Hebrew',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'bn': 'Bengali',
        }

        return mapping.get(lang_code.lower(), 'English')
