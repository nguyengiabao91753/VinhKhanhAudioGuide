"""
TTSService v3 — edge-tts backend (replaces Piper entirely)

Why edge-tts:
  • No model downloads, no binary dependencies
  • Microsoft Neural voices — excellent quality for Vietnamese
  • pip install edge-tts  ← single dependency
  • Vietnamese: vi-VN-HoaiMyNeural (female) / vi-VN-NamMinhNeural (male)
  • Supports 80+ languages out of the box
"""
import asyncio
import edge_tts
import logging
import tempfile
import os
import io

logger = logging.getLogger(__name__)

# ── Voice registry ────────────────────────────────────────────────────────
# Keys: lowercase normalised lang codes (with variants)
# Values: (primary_voice, fallback_voice)
_VOICES: dict[str, tuple[str, str]] = {
    # Vietnamese — the main target language
    'vi':    ('vi-VN-HoaiMyNeural',  'vi-VN-NamMinhNeural'),
    'vi_vn': ('vi-VN-HoaiMyNeural',  'vi-VN-NamMinhNeural'),

    # English
    'en':    ('en-US-JennyNeural',   'en-US-GuyNeural'),
    'en_us': ('en-US-JennyNeural',   'en-US-GuyNeural'),
    'en_gb': ('en-GB-SoniaNeural',   'en-GB-RyanNeural'),

    # Other languages
    'fr':    ('fr-FR-DeniseNeural',  'fr-FR-HenriNeural'),
    'fr_fr': ('fr-FR-DeniseNeural',  'fr-FR-HenriNeural'),
    'de':    ('de-DE-KatjaNeural',   'de-DE-ConradNeural'),
    'de_de': ('de-DE-KatjaNeural',   'de-DE-ConradNeural'),
    'es':    ('es-ES-ElviraNeural',  'es-ES-AlvaroNeural'),
    'es_es': ('es-ES-ElviraNeural',  'es-ES-AlvaroNeural'),
    'it':    ('it-IT-ElsaNeural',    'it-IT-DiegoNeural'),
    'it_it': ('it-IT-ElsaNeural',    'it-IT-DiegoNeural'),
    'pt':    ('pt-PT-FernandaNeural','pt-PT-DuarteNeural'),
    'pt_br': ('pt-BR-FranciscaNeural','pt-BR-AntonioNeural'),
    'ru':    ('ru-RU-SvetlanaNeural','ru-RU-DmitryNeural'),
    'zh':    ('zh-CN-XiaoxiaoNeural','zh-CN-YunxiNeural'),
    'zh_cn': ('zh-CN-XiaoxiaoNeural','zh-CN-YunxiNeural'),
    'zh_tw': ('zh-TW-HsiaoChenNeural','zh-TW-YunJheNeural'),
    'ja':    ('ja-JP-NanamiNeural',  'ja-JP-KeitaNeural'),
    'ja_jp': ('ja-JP-NanamiNeural',  'ja-JP-KeitaNeural'),
    'ko':    ('ko-KR-SunHiNeural',   'ko-KR-InJoonNeural'),
    'ko_kr': ('ko-KR-SunHiNeural',   'ko-KR-InJoonNeural'),
    'th':    ('th-TH-PremwadeeNeural','th-TH-NiwatNeural'),
    'id':    ('id-ID-GadisNeural',   'id-ID-ArdiNeural'),
    'ms':    ('ms-MY-YasminNeural',  'ms-MY-OsmanNeural'),
    'ar':    ('ar-SA-ZariyahNeural', 'ar-SA-HamedNeural'),
    'hi':    ('hi-IN-SwaraNeural',   'hi-IN-MadhurNeural'),
    'nl':    ('nl-NL-FennaNeural',   'nl-NL-MaartenNeural'),
    'pl':    ('pl-PL-AgnieszkaNeural','pl-PL-MarekNeural'),
    'sv':    ('sv-SE-SofieNeural',   'sv-SE-MattiasNeural'),
    'tr':    ('tr-TR-EmelNeural',    'tr-TR-AhmetNeural'),
    'cs':    ('cs-CZ-VlastaNeural',  'cs-CZ-AntoninNeural'),
    'hu':    ('hu-HU-NoemiNeural',   'hu-HU-TamasNeural'),
    'ro':    ('ro-RO-AlinaNeural',   'ro-RO-EmilNeural'),
    'el':    ('el-GR-AthinaNeural',  'el-GR-NestorasNeural'),
    'he':    ('he-IL-HilaNeural',    'he-IL-AvriNeural'),
    'da':    ('da-DK-ChristelNeural','da-DK-JeppeNeural'),
    'no':    ('nb-NO-PernilleNeural','nb-NO-FinnNeural'),
    'fi':    ('fi-FI-NooraNeural',   'fi-FI-HarriNeural'),
    'uk':    ('uk-UA-PolinaNeural',  'uk-UA-OstapNeural'),
}
_DEFAULT_VOICE = 'en-US-JennyNeural'


def _get_voice(language_code: str, gender: str = 'female') -> str:
    """Return the best edge-tts voice name for a given language code."""
    key = language_code.lower().replace('-', '_')
    pair = _VOICES.get(key) or _VOICES.get(key[:2])
    if not pair:
        logger.warning("[tts] no voice for %r – using default", language_code)
        return _DEFAULT_VOICE
    # pair = (female, male)
    return pair[0] if gender.lower() != 'male' else pair[1]


class TTSService:
    """
    Text-to-Speech using Microsoft edge-tts (Neural voices, free).

    Usage:
        svc = TTSService()
        mp3_bytes = svc.generate("Xin chào", "vi")
    """

    def __init__(self):
        # Optional gender preference from env (default: female)
        self.default_gender = os.getenv('TTS_GENDER', 'female')

    def generate(self, text: str, language_code: str,
                 gender: str | None = None) -> bytes | None:
        """
        Generate MP3 audio bytes for *text* in *language_code*.
        Returns bytes or None on failure.
        """
        if not text or not text.strip():
            logger.warning("[tts] empty text")
            return None

        voice = _get_voice(language_code, gender or self.default_gender)
        logger.info("[tts] voice=%s | lang=%s | text_len=%d",
                    voice, language_code, len(text))

        try:
            # edge_tts is async → run in a fresh event loop
            return asyncio.run(self._synthesise(text, voice))
        except Exception as exc:
            logger.error("[tts] error: %s", exc, exc_info=True)
            return None

    async def _synthesise(self, text: str, voice: str) -> bytes:
        """Async core: stream edge-tts output into an in-memory buffer."""
        buf = io.BytesIO()
        communicate = edge_tts.Communicate(text, voice)
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                buf.write(chunk['data'])
        audio = buf.getvalue()
        if not audio:
            raise RuntimeError(f"edge-tts returned empty audio for voice {voice!r}")
        logger.info("[tts] audio ready: %d bytes", len(audio))
        return audio

    def list_voices(self) -> list[dict]:
        """Return available voices (requires internet)."""
        try:
            return asyncio.run(edge_tts.list_voices())
        except Exception as exc:
            logger.error("[tts] list_voices error: %s", exc)
            return []