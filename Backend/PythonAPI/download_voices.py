"""
Script tự động download tất cả Piper TTS voices còn thiếu.
Chạy: python download_voices.py
"""
import os
import requests
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Thư mục lưu voices
VOICES_DIR = os.path.join(os.path.expanduser("~"), ".local", "share", "piper", "voices")
BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main"

VOICES = [
    "vi/vi_VN/25hours_single/neon/medium/vi_VN-25hours_single-neon.onnx",
    "vi/vi_VN/25hours_single/neon/medium/vi_VN-25hours_single-neon.onnx.json",
    "en/en_US/amy/medium/en_US-amy-medium.onnx",
    "en/en_US/amy/medium/en_US-amy-medium.onnx.json",
    "en/en_GB/alba/medium/en_GB-alba-medium.onnx",
    "en/en_GB/alba/medium/en_GB-alba-medium.onnx.json",
    "es/es_ES/carlfm/x-low/es_ES-carlfm-x-low.onnx",
    "es/es_ES/carlfm/x-low/es_ES-carlfm-x-low.onnx.json",
    "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx",
    "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json",
    "de/de_DE/bernd/medium/de_DE-bernd-medium.onnx",
    "de/de_DE/bernd/medium/de_DE-bernd-medium.onnx.json",
    "it/it_IT/adele/x-low/it_IT-adele-x-low.onnx",
    "it/it_IT/adele/x-low/it_IT-adele-x-low.onnx.json",
    "ru/ru_RU/irinia/medium/ru_RU-irinia-medium.onnx",
    "ru/ru_RU/irinia/medium/ru_RU-irinia-medium.onnx.json",
    "zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx",
    "zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json",
    "ja/ja_JP/kokoro/medium/ja_JP-kokoro-medium.onnx",
    "ja/ja_JP/kokoro/medium/ja_JP-kokoro-medium.onnx.json",
    "ko/ko_KR/kss/medium/ko_KR-kss-medium.onnx",
    "ko/ko_KR/kss/medium/ko_KR-kss-medium.onnx.json",
    "pl/pl_PL/darkman/medium/pl_PL-darkman-medium.onnx",
    "pl/pl_PL/darkman/medium/pl_PL-darkman-medium.onnx.json",
    "nl/nl_NL/mls_5809/low/nl_NL-mls_5809-low.onnx",
    "nl/nl_NL/mls_5809/low/nl_NL-mls_5809-low.onnx.json",
    "hu/hu_HU/imre/medium/hu_HU-imre-medium.onnx",
    "hu/hu_HU/imre/medium/hu_HU-imre-medium.onnx.json",
    "ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx",
    "ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx.json",
]

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        logger.info(f"  → Đã có: {os.path.basename(dest_path)}, bỏ qua")
        return True

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    logger.info(f"  ↓ Đang tải: {os.path.basename(dest_path)}")

    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()

        total = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded * 100 // total
                    print(f"\r    {pct}% ({downloaded // 1024 // 1024}MB / {total // 1024 // 1024}MB)", end="", flush=True)

        print()
        return True

    except Exception as e:
        logger.error(f"  ✗ Lỗi khi tải {url}: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False

def main():
    logger.info(f"Thư mục voices: {VOICES_DIR}")
    os.makedirs(VOICES_DIR, exist_ok=True)

    total = len(VOICES)
    success = 0
    failed = []

    for i, voice_path in enumerate(VOICES, 1):
        filename = os.path.basename(voice_path)
        dest = os.path.join(VOICES_DIR, filename)
        url = f"{BASE_URL}/{voice_path}"

        logger.info(f"[{i}/{total}] {filename}")
        if download_file(url, dest):
            success += 1
        else:
            failed.append(filename)

    print(f"\n=== Kết quả ===")
    print(f"Thành công: {success}/{total} files")
    if failed:
        print(f"Thất bại ({len(failed)}):")
        for v in failed:
            print(f"  - {v}")
    else:
        print("Tất cả voices đã sẵn sàng!")
    print(f"\nVoices lưu tại: {VOICES_DIR}")

if __name__ == "__main__":
    main()