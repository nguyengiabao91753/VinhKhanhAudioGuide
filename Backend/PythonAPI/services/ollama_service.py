import requests
import json
import logging
import os

logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(self):
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = os.getenv('OLLAMA_MODEL', 'phi')
        self.timeout = 300  # 5 minutes

    def preprocess(self, text: str, language: str = 'vi') -> dict:
        """
        Preprocess text: fix grammar, identify entities with pronunciation hints
        """
        if not text:
            return {'fixed_text': text, 'entities': []}

        system_prompt = self._get_system_prompt(language)

        try:
            payload = {
                'model': self.model,
                'prompt': text,
                'system': system_prompt,
                'stream': False
            }

            logger.info(f"Calling Ollama API: {self.base_url}/api/generate")
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()

            result = response.json()
            response_text = result.get('response', '')

            if not response_text:
                logger.warning("Ollama returned empty response")
                return {'fixed_text': text, 'entities': []}

            fixed_text, entities = self._parse_response(response_text, text)

            return {
                'fixed_text': fixed_text,
                'entities': entities
            }

        except requests.exceptions.ConnectionError:
            logger.error("Failed to connect to Ollama API")
            return {'fixed_text': text, 'entities': []}
        except requests.exceptions.Timeout:
            logger.error("Ollama API request timeout")
            return {'fixed_text': text, 'entities': []}
        except Exception as e:
            logger.error(f"Error calling Ollama: {str(e)}")
            return {'fixed_text': text, 'entities': []}

    def _get_system_prompt(self, language: str) -> str:
        """Get system prompt for Ollama based on language"""
        if language == 'vi':
            lines = [
                "You are a Vietnamese proper noun identifier. Output ONLY valid JSON.",
                "CRITICAL: english_pronunciation is TRANSLITERATION only, NEVER translate the meaning of names.",
                "Sau=Sau (not Six), Hung=Hung (not Heroic), Thanh=Thanh (not Pure), Minh=Minh (not Bright).",
                "PERSON: Mr or Mrs + name with diacritics removed. Keep name sound exactly as-is.",
                "LOCATION: use official English name if exists (Ho Chi Minh City, Hanoi, Da Nang), else remove diacritics only.",
                "LANDMARK: remove diacritics only, do not translate.",
                'Example output: {"fixed_text": "Nha hang ong Sau", "entities": [{"original": "ong Sau", "type": "PERSON", "proper_name": "ong Sau", "english_pronunciation": "Mr Sau"}, {"original": "Nha hang", "type": "LANDMARK", "proper_name": "Nha hang", "english_pronunciation": "Nha Hang"}]}',
                "Output ONLY the JSON object. No explanation, no markdown, no extra text."
            ]
            return "\n".join(lines)
        else:
            return ('Output ONLY a JSON object: '
                    '{"fixed_text": "corrected text", "entities": ['
                    '{"original": "name", "type": "PERSON", "proper_name": "name", "english_pronunciation": "pronunciation"}'
                    ']}. No explanation, no markdown.')

    def _parse_response(self, response_text: str, fallback_text: str) -> tuple:
        """Parse JSON response from Ollama"""
        try:
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1

            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                parsed = json.loads(json_str)

                fixed_text = parsed.get('fixed_text', fallback_text)
                entities = parsed.get('entities', [])

                return fixed_text, entities
        except json.JSONDecodeError:
            logger.warning("Failed to parse Ollama JSON response")

        return fallback_text, []