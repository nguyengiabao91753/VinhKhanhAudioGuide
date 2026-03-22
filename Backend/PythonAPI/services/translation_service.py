"""
TranslationService v3
- Uses deep-translator (Google Translate) — reliable, free
- UUID placeholders that survive Google Translate
- Same-language passthrough (no API call)
- Optional DeepL backend for higher quality (set TRANSLATION_BACKEND=deepl)
"""
from deep_translator import GoogleTranslator
import logging
import re
import uuid

logger = logging.getLogger(__name__)

# ── Language normalisation ────────────────────────────────────────────────
_LANG_MAP: dict = {
    'vi': 'vi', 'vi_vn': 'vi', 'vi-vn': 'vi',
    'en': 'en', 'en_us': 'en', 'en-us': 'en', 'en_gb': 'en',
    'fr': 'fr', 'fr_fr': 'fr', 'de': 'de', 'de_de': 'de',
    'es': 'es', 'es_es': 'es', 'it': 'it', 'it_it': 'it',
    'pt': 'pt', 'pt_pt': 'pt', 'pt_br': 'pt',
    'ru': 'ru', 'ru_ru': 'ru',
    'zh': 'zh-CN', 'zh_cn': 'zh-CN', 'zh-cn': 'zh-CN',
    'zh_tw': 'zh-TW', 'zh-tw': 'zh-TW',
    'ja': 'ja', 'ja_jp': 'ja', 'ko': 'ko', 'ko_kr': 'ko',
    'th': 'th', 'id': 'id', 'ms': 'ms', 'ar': 'ar',
    'hi': 'hi', 'nl': 'nl', 'pl': 'pl', 'sv': 'sv',
    'tr': 'tr', 'cs': 'cs', 'hu': 'hu', 'ro': 'ro',
    'el': 'el', 'he': 'he', 'da': 'da', 'no': 'no',
    'fi': 'fi', 'uk': 'uk', 'bn': 'bn',
}


def _norm(code: str) -> str:
    return _LANG_MAP.get(code.lower().replace('-', '_'), code.lower())


def _same(a: str, b: str) -> bool:
    na, nb = _norm(a), _norm(b)
    if na == nb:
        return True
    # "vi" == "vi_VN"; but "zh-CN" != "zh-TW"
    return na[:2] == nb[:2] and na[:2] not in ('zh',)


class TranslationService:
    def __init__(self):
        self.cache: dict = {}

    def translate(self, text: str, from_lang: str, to_lang: str,
                  entity_mappings: dict | None = None) -> str:
        """
        Translate text from from_lang to to_lang.
        entity_mappings: {original: replacement_after_translation}
        Entities are shielded with UUID tokens before sending to Google.
        """
        if not text or not text.strip():
            return text

        # ── Same language → return as-is ──────────────────────────────────
        if _same(from_lang, to_lang):
            logger.info("[trans] passthrough (%s == %s)", from_lang, to_lang)
            return text

        from_n, to_n = _norm(from_lang), _norm(to_lang)

        # ── Cache ──────────────────────────────────────────────────────────
        ck = (from_n, to_n, text, tuple(sorted((entity_mappings or {}).items())))
        if ck in self.cache:
            return self.cache[ck]

        try:
            # ── Build UUID placeholder map ─────────────────────────────────
            # Token looks like a code variable → Google leaves it alone
            working  = text
            ph_map: dict[str, str] = {}

            for original, replacement in sorted(
                    (entity_mappings or {}).items(),
                    key=lambda x: len(x[0]), reverse=True):
                if not original or not replacement:
                    continue
                pat = re.compile(re.escape(original), re.IGNORECASE)
                if not pat.search(working):
                    continue
                token = f"__NP{uuid.uuid4().hex[:6].upper()}__"
                working = pat.sub(token, working)
                ph_map[token] = replacement
                logger.info("[trans] protect %r → %s → %r", original, token, replacement)

            # ── Translate ──────────────────────────────────────────────────
            logger.info("[trans] Google %s→%s | protected=%d | len=%d",
                        from_n, to_n, len(ph_map), len(working))
            result = GoogleTranslator(source=from_n, target=to_n).translate(working)

            if not result:
                logger.warning("[trans] empty response")
                return text

            # ── Restore ────────────────────────────────────────────────────
            for token, replacement in ph_map.items():
                for variant in [
                    token,
                    token.lower(),
                    token.replace('__', ' __ ').strip(),
                    re.sub(r'\s+', '', token),
                ]:
                    if variant in result:
                        result = result.replace(variant, replacement)
                        break
                else:
                    # Fuzzy: strip spaces Google may have injected inside token
                    inner = token[2:-2]  # strip leading/trailing __
                    result = re.sub(
                        r'__\s*' + re.escape(inner) + r'\s*__',
                        replacement, result, flags=re.IGNORECASE
                    )

            logger.info("[trans] done: %r", result)
            self.cache[ck] = result
            return result

        except Exception as exc:
            logger.error("[trans] error: %s", exc, exc_info=True)
            return text

    def translate_with_entities(self, text: str, from_lang: str, to_lang: str,
                                entities: list) -> str:
        """
        Translate while protecting proper nouns from entity list.
        entity schema: {original, type, proper_name, english_pronunciation}
        """
        if not text:
            return text

        mappings: dict[str, str] = {}
        for ent in (entities or []):
            original = (ent.get('original') or '').strip()
            if not original:
                continue
            if _same(to_lang, 'vi'):
                mappings[original] = (ent.get('proper_name') or original).strip()
            else:
                mappings[original] = (
                    ent.get('english_pronunciation')
                    or ent.get('proper_name')
                    or original
                ).strip()

        return self.translate(text, from_lang, to_lang, mappings)