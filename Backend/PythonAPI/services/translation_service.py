from deep_translator import GoogleTranslator
import logging
import re
import os

logger = logging.getLogger(__name__)


class TranslationService:
    def __init__(self):
        self.cache = {}

    def translate(self, text: str, from_lang: str, to_lang: str, entity_mappings: dict = None) -> str:
        """
        Translate text using deep-translator (Google Translate).
        Uses placeholder technique to preserve proper nouns during translation.
        entity_mappings: {original_vi_name: tts_friendly_text}
        """
        if not text:
            return text

        if from_lang == to_lang:
            return text

        cache_key = f"{from_lang}_{to_lang}_{text}_{str(entity_mappings)}"
        if cache_key in self.cache:
            logger.info("Using cached translation")
            return self.cache[cache_key]

        try:
            from_normalized = self._normalize_lang_code(from_lang)
            to_normalized = self._normalize_lang_code(to_lang)

            logger.info(f"Translating from {from_normalized} to {to_normalized}")

            # Step 1: Replace proper nouns with placeholders BEFORE translation
            text_to_translate = text
            placeholder_map = {}  # {PLACEHOLDER_0: tts_friendly_name}

            if entity_mappings:
                # Sort by length descending to replace longer matches first
                sorted_entities = sorted(entity_mappings.items(), key=lambda x: len(x[0]), reverse=True)
                for i, (original, tts_friendly) in enumerate(sorted_entities):
                    if not original or not tts_friendly:
                        continue
                    placeholder = f"XPROTNOUNX{i}X"
                    pattern = re.compile(re.escape(original), re.IGNORECASE)
                    if pattern.search(text_to_translate):
                        text_to_translate = pattern.sub(placeholder, text_to_translate)
                        placeholder_map[placeholder] = tts_friendly
                        logger.info(f"Replaced '{original}' -> '{placeholder}' -> will restore as '{tts_friendly}'")

            # Step 2: Translate with placeholders (Google won't translate XPROTNOUNX0X)
            translator = GoogleTranslator(source=from_normalized, target=to_normalized)
            translated = translator.translate(text_to_translate)
            logger.info(f"Translation successful: {translated}")

            # Step 3: Restore placeholders with TTS-friendly names
            for placeholder, tts_friendly in placeholder_map.items():
                translated = translated.replace(placeholder, tts_friendly)
                # Also handle case where Google might add spaces around placeholder
                translated = translated.replace(placeholder.lower(), tts_friendly)

            logger.info(f"Final translated text: {translated}")
            self.cache[cache_key] = translated
            return translated

        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return text

    def translate_with_entities(self, text: str, from_lang: str, to_lang: str, entities: list) -> str:
        """
        Translate text while preserving proper noun pronunciation.
        Uses english_pronunciation field from entities when translating to non-vi languages.
        """
        if not text:
            return text

        entity_mappings = {}
        if entities and to_lang != 'vi':
            for entity in entities:
                original = entity.get('original', '')
                pronunciation = entity.get('english_pronunciation') or entity.get('proper_name', '')
                if original and pronunciation:
                    entity_mappings[original] = pronunciation

        return self.translate(text, from_lang, to_lang, entity_mappings)

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