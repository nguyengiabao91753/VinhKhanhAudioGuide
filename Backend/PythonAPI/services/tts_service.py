import subprocess
import logging
import os
import tempfile

logger = logging.getLogger(__name__)


class TTSService:
    def __init__(self):
        self.piper_path = os.getenv('PIPER_PATH', 'piper')
        self.voices_path = os.getenv('PIPER_VOICES_PATH', os.path.join(os.path.expanduser('~'), '.local', 'share', 'piper', 'voices'))

    def generate(self, text: str, language_code: str) -> bytes:
        """
        Generate audio from text using Piper TTS
        Returns: WAV audio bytes
        """
        if not text:
            return None

        temp_output = None
        try:
            voice_model = self._get_voice_model(language_code)

            logger.info(f"Generating audio for {language_code} using voice {voice_model}")

            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                temp_output = tmp.name

            cmd = [
                self.piper_path,
                '--model', voice_model,
                '--data-dir', self.voices_path,
                '--output-file', temp_output
            ]

            logger.info(f"Running Piper command: {' '.join(cmd)}")

            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=False
            )

            stdout, stderr = process.communicate(input=text.encode('utf-8'), timeout=120)

            if process.returncode != 0:
                error_msg = stderr.decode('utf-8', errors='ignore')
                logger.error(f"Piper TTS failed with return code {process.returncode}: {error_msg}")
                return None

            if not os.path.exists(temp_output):
                logger.error(f"Piper output file not created: {temp_output}")
                return None

            with open(temp_output, 'rb') as f:
                audio_bytes = f.read()

            if not audio_bytes:
                logger.error("Piper output file is empty")
                return None

            logger.info(f"Audio generation successful ({len(audio_bytes)} bytes)")
            return audio_bytes

        except subprocess.TimeoutExpired:
            logger.error("Piper TTS timeout (exceeded 120 seconds)")
            return None
        except FileNotFoundError as e:
            logger.error(f"Piper TTS executable not found: {self.piper_path}. Error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error generating audio: {str(e)}", exc_info=True)
            return None
        finally:
            if temp_output and os.path.exists(temp_output):
                try:
                    os.unlink(temp_output)
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {temp_output}: {str(e)}")

    def _get_voice_model(self, language_code: str) -> str:
        """Get Piper voice model for language"""
        models = {
            'vi_VN': 'vi_VN-25hours_single-neon',
            'vi': 'vi_VN-25hours_single-neon',
            'en_US': 'en_US-amy-medium',
            'en': 'en_US-amy-medium',
            'en_GB': 'en_GB-alba-medium',
            'es_ES': 'es_ES-carlfm-x-low',
            'es': 'es_ES-carlfm-x-low',
            'fr_FR': 'fr_FR-siwis-medium',
            'fr': 'fr_FR-siwis-medium',
            'de_DE': 'de_DE-bernd-medium',
            'de': 'de_DE-bernd-medium',
            'it_IT': 'it_IT-adele-x-low',
            'it': 'it_IT-adele-x-low',
            'pt_PT': 'pt_PT-tugao-medium',
            'pt': 'pt_PT-tugao-medium',
            'pt_BR': 'pt_BR-edresson-low',
            'ru_RU': 'ru_RU-irinia-medium',
            'ru': 'ru_RU-irinia-medium',
            'zh_CN': 'zh_CN-huayan-medium',
            'zh': 'zh_CN-huayan-medium',
            'ja_JP': 'ja_JP-kokoro-medium',
            'ja': 'ja_JP-kokoro-medium',
            'ko_KR': 'ko_KR-kss-medium',
            'ko': 'ko_KR-kss-medium',
            'th_TH': 'th_TH-acharan-medium',
            'th': 'th_TH-acharan-medium',
            'tr_TR': 'tr_TR-dfki-medium',
            'tr': 'tr_TR-dfki-medium',
            'pl_PL': 'pl_PL-darkman-medium',
            'pl': 'pl_PL-darkman-medium',
            'nl_NL': 'nl_NL-mls_5809-low',
            'nl': 'nl_NL-mls_5809-low',
            'el_GR': 'el_GR-pagerman-medium',
            'el': 'el_GR-pagerman-medium',
            'hu_HU': 'hu_HU-imre-medium',
            'hu': 'hu_HU-imre-medium',
            'ro_RO': 'ro_RO-mihai-medium',
            'ro': 'ro_RO-mihai-medium',
        }

        return models.get(language_code, 'en_US-amy-medium')