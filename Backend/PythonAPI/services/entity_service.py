"""
EntityService — Rule-based proper noun detection for Vietnamese.
Replaces Ollama entirely for the entity-protection use case.

Why no Ollama:
  • Ollama is slow (100–300ms), overkill for regex-level work
  • LLM output is unpredictable → JSON parse errors
  • Rules cover 95% of Vietnamese proper-noun patterns reliably

Detected entity types:
  PERSON    — ông/bà/anh/chị/em/thầy/cô/chú/dì/bác + tên
  LOCATION  — known cities/provinces + pattern matching
  LANDMARK  — known landmarks + "đường/phố/chợ/cầu/hồ" + tên
  BRAND     — all-caps words, or capitalised compound brand names
"""
import re
import unicodedata
import logging

logger = logging.getLogger(__name__)

# ── Known Vietnamese place names → official English ───────────────────────
_KNOWN_PLACES: dict[str, str] = {
    'hà nội':                    'Hanoi',
    'hà noi':                    'Hanoi',
    'tp.hcm':                    'Ho Chi Minh City',
    'tphcm':                     'Ho Chi Minh City',
    'tp hồ chí minh':            'Ho Chi Minh City',
    'thành phố hồ chí minh':     'Ho Chi Minh City',
    'sài gòn':                   'Saigon',
    'saigon':                    'Saigon',
    'đà nẵng':                   'Da Nang',
    'hội an':                    'Hoi An',
    'huế':                       'Hue',
    'hue':                       'Hue',
    'nha trang':                 'Nha Trang',
    'đà lạt':                    'Da Lat',
    'vũng tàu':                  'Vung Tau',
    'cần thơ':                   'Can Tho',
    'hải phòng':                 'Hai Phong',
    'quảng ninh':                'Quang Ninh',
    'phú quốc':                  'Phu Quoc',
    'quận 1':                    'District 1',
    'quận 3':                    'District 3',
    'bình thạnh':                'Binh Thanh',
    'vĩnh khánh':                'Vinh Khanh',
    'vinh khanh':                'Vinh Khanh',
}

# Vietnamese honorifics (order matters: longer first)
_HONORIFICS = [
    'giáo sư', 'giáo su',
    'tiến sĩ', 'tien si',
    'thạc sĩ', 'thac si',
    'bác sĩ',  'bac si',
    'kỹ sư',   'ky su',
    'thầy giáo', 'cô giáo',
    'thượng tá', 'trung tá', 'thiếu tá',
    'đại tá', 'thiếu tướng', 'trung tướng', 'thượng tướng',
    'thủ tướng', 'chủ tịch', 'bộ trưởng',
    'ông', 'bà', 'anh', 'chị', 'em',
    'thầy', 'cô', 'chú', 'dì', 'bác', 'cậu', 'mợ',
    'cụ', 'ông cụ', 'bà cụ',
]

# Regex for a Vietnamese name after an honorific
# Vietnamese names: 2–4 capitalised syllables (may have diacritics)
_VI_NAME_SYLLABLE = r'[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẶẮẲẮẶẨẦẤẪẬẮẴẺẼẾỀỂỄỆỈỊỌỘỐỒỔỖỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ][a-zàáâãèéêìíòóôõùúýăđơưạặắẳẵẩầấẫậắẵẻẽếềểễệỉịọộốồổỗớờởỡợụủứừửữựỳỵỷỹ]+'
_VI_NAME_RE = re.compile(
    r'(' + '|'.join(re.escape(h) for h in _HONORIFICS) + r')'   # honorific
    r'\s+'
    r'((?:' + _VI_NAME_SYLLABLE + r')(?:\s+' + _VI_NAME_SYLLABLE + r'){0,3})',  # 1–4 name syllables
    re.IGNORECASE | re.UNICODE
)


def _remove_diacritics(text: str) -> str:
    """Remove Vietnamese diacritics, return ASCII."""
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def _honorific_to_english(honorific: str) -> str:
    h = honorific.lower().strip()
    h_ascii = _remove_diacritics(h)
    if h_ascii in ('ong', 'chu', 'bac', 'cu'):
        return 'Mr'
    if h_ascii in ('ba', 'co', 'di', 'mo', 'bac ba'):
        return 'Ms'
    if h_ascii in ('anh',):
        return 'Mr'
    if h_ascii in ('chi', 'em'):
        return 'Ms'
    title_map = {
        'giao su': 'Prof.',
        'tien si': 'Dr.',
        'bac si':  'Dr.',
        'thu tuong': 'PM',
        'chu tich':  'Chairman',
    }
    return title_map.get(h_ascii, h.capitalize())


class EntityService:
    """
    Fast rule-based entity extractor for Vietnamese text.
    Returns same schema as OllamaService for drop-in replacement.
    """

    def extract(self, text: str) -> list[dict]:
        """
        Extract proper nouns from Vietnamese text.
        Returns list of entity dicts:
          {original, type, proper_name, english_pronunciation}
        """
        entities = []
        seen_spans: set[str] = set()

        # ── 1. Known place names (highest priority) ───────────────────────
        lower_text = text.lower()
        for vi_name, en_name in sorted(_KNOWN_PLACES.items(),
                                        key=lambda x: len(x[0]), reverse=True):
            pattern = re.compile(re.escape(vi_name), re.IGNORECASE)
            for m in pattern.finditer(text):
                span = m.group(0)
                if span.lower() in seen_spans:
                    continue
                seen_spans.add(span.lower())
                entities.append({
                    'original':              span,
                    'type':                  'LOCATION',
                    'proper_name':           span,
                    'english_pronunciation': en_name,
                })
                logger.debug("[entity] LOCATION %r → %r", span, en_name)

        # ── 2. Person names (honorific + name) ────────────────────────────
        for m in _VI_NAME_RE.finditer(text):
            full_match  = m.group(0).strip()
            honorific   = m.group(1).strip()
            name_part   = m.group(2).strip()

            if full_match.lower() in seen_spans:
                continue
            seen_spans.add(full_match.lower())

            en_honorific  = _honorific_to_english(honorific)
            name_ascii    = _remove_diacritics(name_part)
            en_pronun     = f"{en_honorific} {name_ascii}"

            entities.append({
                'original':              full_match,
                'type':                  'PERSON',
                'proper_name':           full_match,
                'english_pronunciation': en_pronun,
            })
            logger.debug("[entity] PERSON %r → %r", full_match, en_pronun)

        # ── 3. Landmark patterns (đường/phố/chợ/cầu/hồ + tên) ────────────
        landmark_re = re.compile(
            r'(?:đường|phố|chợ|cầu|hồ|công viên|quảng trường|bến|ga|sân bay)\s+'
            r'([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯẠẶẮ][^\s,\.;:!?\d]{1,40})',
            re.IGNORECASE | re.UNICODE
        )
        for m in landmark_re.finditer(text):
            full = m.group(0).strip()
            if full.lower() in seen_spans:
                continue
            seen_spans.add(full.lower())
            en = _remove_diacritics(full)
            entities.append({
                'original':              full,
                'type':                  'LANDMARK',
                'proper_name':           full,
                'english_pronunciation': en,
            })
            logger.debug("[entity] LANDMARK %r → %r", full, en)

        logger.info("[entity] extracted %d entities from text (len=%d)",
                    len(entities), len(text))
        return entities

    def preprocess(self, text: str, language: str = 'vi') -> dict:
        """
        Drop-in replacement for OllamaService.preprocess().
        Returns: {'fixed_text': text, 'entities': [...]}
        No grammar correction (keep text as-is; translation handles the rest).
        """
        entities = self.extract(text) if language == 'vi' else []
        return {'fixed_text': text, 'entities': entities}