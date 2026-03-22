"""
OllamaService v2
Improvements:
- Stronger system prompt: forces JSON-only output, prevents meaning-translation of names
- Detects PERSON, LOCATION, LANDMARK, FOOD, ORGANIZATION
- Better JSON extraction (handles markdown fences)
- Graceful degradation if Ollama unavailable
"""
import requests
import json
import logging
import re
import os

logger = logging.getLogger(__name__)

# ── Prompt constants ──────────────────────────────────────────────────────

_VI_SYSTEM = """\
You are a Vietnamese proper-noun extractor.
Your ONLY job: identify proper nouns in the input and output a single JSON object.

OUTPUT FORMAT (strict, no extra text, no markdown):
{"fixed_text": "<lightly cleaned input>", "entities": [
  {"original": "<exact span from text>", "type": "<TYPE>", "proper_name": "<Vietnamese form>", "english_pronunciation": "<ASCII transliteration or official English name>"}
]}

TYPES: PERSON | LOCATION | LANDMARK | FOOD_BRAND | ORGANIZATION

RULES for english_pronunciation:
- NEVER translate the MEANING of a name.
  Wrong: Hung → Heroic, Thanh → Pure, Sau → Six, Bắc → North
  Right: Hung → Hung, Thanh → Thanh, Sau → Sau, Bắc → Bac
- PERSON: "Mr/Mrs/Ms <name-without-diacritics>"
  Examples: ông Sáu → "Mr Sau", bà Lan → "Mrs Lan"
- LOCATION (city/province): use official English name if it exists:
  Hà Nội → "Hanoi", TP.HCM / Thành phố Hồ Chí Minh → "Ho Chi Minh City",
  Đà Nẵng → "Da Nang", Hội An → "Hoi An", Huế → "Hue"
  Otherwise remove diacritics only: Vĩnh Khánh → "Vinh Khanh"
- LANDMARK/FOOD_BRAND/ORGANIZATION: remove diacritics only, keep original word order.
- Do NOT extract common nouns (nhà hàng, quán ăn, đường phố, etc.) as entities
  unless they are part of a PROPER NAME (e.g. "Nhà Hàng Thanh Tâm" is an org).

If no entities found: {"fixed_text": "<input>", "entities": []}
Output ONLY the JSON. Absolutely no markdown, no explanation."""

_EN_SYSTEM = """\
Extract proper nouns from the input.
Output ONLY JSON:
{"fixed_text": "<input unchanged>", "entities": [
  {"original": "name", "type": "PERSON|LOCATION|LANDMARK|ORGANIZATION", "proper_name": "name", "english_pronunciation": "name"}
]}
No explanation, no markdown."""


class OllamaService:
    def __init__(self):
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model    = os.getenv('OLLAMA_MODEL', 'phi')
        self.timeout  = int(os.getenv('OLLAMA_TIMEOUT', '120'))

    # ── Public ────────────────────────────────────────────────────────────

    def preprocess(self, text: str, language: str = 'vi') -> dict:
        """
        Preprocess text: fix grammar + identify proper nouns.
        Returns: {'fixed_text': str, 'entities': list}
        """
        if not text or not text.strip():
            return {'fixed_text': text, 'entities': []}

        system_prompt = _VI_SYSTEM if language == 'vi' else _EN_SYSTEM

        payload = {
            'model':  self.model,
            'prompt': text,
            'system': system_prompt,
            'stream': False,
            'options': {
                'temperature': 0.1,   # low = more deterministic JSON
                'num_predict': 512,
            }
        }

        try:
            logger.info("[ollama] preprocess lang=%s model=%s url=%s",
                        language, self.model, self.base_url)
            resp = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            resp.raise_for_status()

            raw = resp.json().get('response', '')
            if not raw:
                logger.warning("[ollama] empty response")
                return {'fixed_text': text, 'entities': []}

            fixed, entities = self._parse_response(raw, text)
            logger.info("[ollama] entities found: %d", len(entities))
            for e in entities:
                logger.debug("[ollama]   %s", e)
            return {'fixed_text': fixed, 'entities': entities}

        except requests.exceptions.ConnectionError:
            logger.warning("[ollama] connection failed – entity extraction skipped")
        except requests.exceptions.Timeout:
            logger.warning("[ollama] timeout – entity extraction skipped")
        except Exception as exc:
            logger.error("[ollama] error: %s", exc, exc_info=True)

        return {'fixed_text': text, 'entities': []}

    # ── Private ───────────────────────────────────────────────────────────

    def _parse_response(self, raw: str, fallback: str) -> tuple:
        """Extract (fixed_text, entities) from Ollama output."""
        # Strip markdown code fences if present
        raw = re.sub(r'```(?:json)?\s*', '', raw).strip()

        # Find outermost JSON object
        start = raw.find('{')
        end   = raw.rfind('}') + 1
        if start < 0 or end <= start:
            logger.warning("[ollama] no JSON object found in response")
            return fallback, []

        json_str = raw[start:end]
        try:
            parsed   = json.loads(json_str)
            fixed    = (parsed.get('fixed_text') or fallback).strip()
            entities = self._validate_entities(parsed.get('entities', []))
            return fixed, entities
        except json.JSONDecodeError as exc:
            logger.warning("[ollama] JSON parse error: %s | raw: %r", exc, json_str[:200])
            return fallback, []

    def _validate_entities(self, raw_entities: list) -> list:
        """
        Validate and normalise entity list.
        Removes entries with empty 'original' or missing keys.
        """
        valid = []
        for ent in (raw_entities or []):
            if not isinstance(ent, dict):
                continue
            original = (ent.get('original') or '').strip()
            if not original:
                continue
            valid.append({
                'original':              original,
                'type':                  ent.get('type', 'UNKNOWN'),
                'proper_name':           (ent.get('proper_name') or original).strip(),
                'english_pronunciation': (ent.get('english_pronunciation') or original).strip(),
            })
        return valid