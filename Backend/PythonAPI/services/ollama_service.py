import requests
import json
import logging
import os

logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(self):
        self.base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = os.getenv('OLLAMA_MODEL', 'llama2')
        self.timeout = 300  # 5 minutes

    def preprocess(self, text: str, language: str = 'vi') -> dict:
        """
        Preprocess text: fix grammar, identify entities
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

            # Parse JSON from Ollama response
            fixed_text, entities = self._parse_response(response_text, text)

            return {
                'fixed_text': fixed_text,
                'entities': entities
            }

        except requests.exceptions.ConnectionError:
            logger.error("Failed to connect to Ollama API")
            # Fallback: return original text
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
            return """You are a Vietnamese language expert. Your task is to:
1. Fix grammar and spelling errors in the provided text
2. Identify and list all proper nouns (people names, place names, landmarks, etc.)
3. For each proper noun, provide its type (PERSON, LOCATION, LANDMARK, etc.)

Return response as JSON with this format:
{
  "fixed_text": "corrected text here",
  "entities": [
    {"original": "original name", "type": "PERSON", "proper_name": "corrected name"}
  ]
}

Only return valid JSON, no other text."""
        else:
            return """You are a language expert. Your task is to:
1. Fix grammar and spelling errors in the provided text
2. Identify and list all proper nouns (people names, place names, landmarks, etc.)

Return response as JSON with this format:
{
  "fixed_text": "corrected text here",
  "entities": [
    {"original": "original name", "type": "PERSON", "proper_name": "corrected name"}
  ]
}

Only return valid JSON, no other text."""

    def _parse_response(self, response_text: str, fallback_text: str) -> tuple:
        """Parse JSON response from Ollama"""
        try:
            # Find JSON in response
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
