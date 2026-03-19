from deep_translator import GoogleTranslator
import logging
import os

logger = logging.getLogger(__name__)


class TranslationService:
    def __init__(self):
        self.cache = {}

    def translate(self, text: str, from_lang: str, to_lang: str, entity_mappings: dict = None) -> str:
        """
        Translate text using deep-translator (Google Translate)
        Preserves entity mappings (e.g., "Ông Sáu" -> "Mr Sáu")
        """
        if not text:
            return text

        if from_lang == to_lang:
            return text

        # Create cache key
        cache_key = f"{from_lang}_{to_lang}_{text}"
        if cache_key in self.cache:
            logger.info("Using cached translation")
            return self.cache[cache_key]

        try:
            # Normalize language codes
            from_normalized = self._normalize_lang_code(from_lang)
            to_normalized = self._normalize_lang_code(to_lang)

            logger.info(f"Translating from {from_normalized} to {to_normalized}")

            translator = GoogleTranslator(source_language=from_normalized, target_language=to_normalized)
            translated = translator.translate(text)

            logger.info(f"Translation successful")

            # Apply entity mappings if provided
            if entity_mappings:
                translated = self._apply_entity_mappings(translated, entity_mappings)

            # Cache result
            self.cache[cache_key] = translated

            return translated

        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            # Fallback: return original text
            return text

    def _normalize_lang_code(self, lang_code: str) -> str:
        """Normalize language code to deep-translator format"""
        mapping = {
            'vi': 'vi',
            'en': 'en',
            'es': 'es',
            'fr': 'fr',
            'de': 'de',
            'it': 'it',
            'pt': 'pt',
            'ru': 'ru',
            'zh': 'zh-CN',
            'ja': 'ja',
            'ko': 'ko',
            'th': 'th',
            'id': 'id',
            'fil': 'tl',
            'ms': 'ms',
            'my': 'my',
            'km': 'km',
            'lo': 'lo',
            'tr': 'tr',
            'pl': 'pl',
            'sv': 'sv',
            'no': 'no',
            'da': 'da',
            'nl': 'nl',
            'el': 'el',
            'cs': 'cs',
            'hu': 'hu',
            'ro': 'ro',
            'he': 'he',
            'ar': 'ar',
            'hi': 'hi',
            'bn': 'bn',
        }
        return mapping.get(lang_code.lower(), lang_code.lower())

    def _apply_entity_mappings(self, translated_text: str, entity_mappings: dict) -> str:
        """
        Apply entity mappings to preserve proper nouns
        Example: {"Ông Sáu": "Mr Sáu"}
        """
        if not entity_mappings:
            return translated_text

        result = translated_text
        for original, mapped in entity_mappings.items():
            # Case-insensitive replacement
            import re
            pattern = re.compile(re.escape(original), re.IGNORECASE)
            result = pattern.sub(mapped, result)

        return result
