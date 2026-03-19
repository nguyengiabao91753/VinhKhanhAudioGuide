"""
Script tự động download tất cả Piper TTS voices.
Chạy: python download_voices.py
"""
import os
import requests
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

VOICES_DIR = os.path.join(os.path.expanduser("~"), ".local", "share", "piper", "voices")
BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main"

VOICES = [
    # Tiếng Việt
    ("vi/vi_VN/25hours_single/neon/medium/vi_VN-25hours_single-neon.onnx", "vi_VN-25hours_single-neon.onnx"),
    ("vi/vi_VN/25hours_single/neon/medium/vi_VN-25hours_single-neon.onnx.json", "vi_VN-25hours_single-neon.onnx.json"),
    # Tiếng Anh US
    ("en/en_US/amy/medium/en_US-amy-medium.onnx", "en_US-amy-medium.onnx"),
    ("en/en_US/amy/medium/en_US-amy-medium.onnx.json", "en_US-amy-medium.onnx.json"),
    # Tiếng Anh GB
    ("en/en_GB/alba/medium/en_GB-alba-medium.onnx", "en_GB-alba-medium.onnx"),
    ("en/en_GB/alba/medium/en_GB-alba-medium.onnx.json", "en_GB-alba-medium.onnx.json"),
    # Tiếng Tây Ban Nha
    ("es/es_ES/carlfm/x-low/es_ES-carlfm-x-low.onnx", "es_ES-carlfm-x-low.onnx"),
    ("es/es_ES/carlfm/x-low/es_ES-carlfm-x-low.onnx.json", "es_ES-carlfm-x-low.onnx.json"),
    # Tiếng Pháp
    ("fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx", "fr_FR-siwis-medium.onnx"),
    ("fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json", "fr_FR-siwis-medium.onnx.json"),
    # Tiếng Đức
    ("de/de_DE/bernd/medium/de_DE-bernd-medium.onnx", "de_DE-bernd-medium.onnx"),
    ("de/de_DE/bernd/medium/de_DE-bernd-medium.onnx.json", "de_DE-bernd-medium.onnx.json"),
    # Tiếng Ý
    ("it/it_IT/adele/x-low/it_IT-adele-x-low.onnx", "it_IT-adele-x-low.onnx"),
    ("it/it_IT/adele/x-low/it_IT-adele-x-low.onnx.json", "it_IT-adele-x-low.onnx.json"),
    # Tiếng Bồ Đào Nha
    ("pt/pt_PT/tugao/medium/pt_PT-tugao-medium.onnx", "pt_PT-tugao-medium.onnx"),
    ("pt/pt_PT/tugao/medium/pt_PT-tugao-medium.onnx.json", "pt_PT-tugao-medium.onnx.json"),
    # Tiếng Nga
    ("ru/ru_RU/irinia/medium/ru_RU-irinia-medium.onnx", "ru_RU-irinia-medium.onnx"),
    ("ru/ru_RU/irinia/medium/ru_RU-irinia-medium.onnx.json", "ru_RU-irinia-medium.onnx.json"),
    # Tiếng Trung
    ("zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx", "zh_CN-huayan-medium.onnx"),
    ("zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json", "zh_CN-huayan-medium.onnx.json"),
    # Tiếng Nhật
    ("ja/ja_JP/kokoro/medium/ja_JP-kokoro-medium.onnx", "ja_JP-kokoro-medium.onnx"),
    ("ja/ja_JP/kokoro/medium/ja_JP-kokoro-medium.onnx.json", "ja_JP-kokoro-medium.onnx.json"),
    # Tiếng Hàn
    ("ko/ko_KR/kss/medium/ko_KR-kss-medium.onnx", "ko_KR-kss-medium.onnx"),
    ("ko/ko_KR/kss/medium/ko_KR-kss-medium.onnx.json", "ko_KR-kss-medium.onnx.json"),
    # Tiếng Thái
    ("th/th_TH/acharan/medium/th_TH-acharan-medium.onnx", "th_TH-acharan-medium.onnx"),
    ("th/th_TH/acharan/medium/th_TH-acharan-medium.onnx.json", "th_TH-acharan-medium.onnx.json"),
    # Tiếng Thổ Nhĩ Kỳ
    ("tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx", "tr_TR-dfki-medium.onnx"),
    ("tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx.json", "tr_TR-dfki-medium.onnx.json"),
    # Tiếng Ba Lan
    ("pl/pl_PL/darkman/medium/pl_PL-darkman-medium.onnx", "pl_PL-darkman-medium.onnx"),
    ("pl/pl_PL/darkman/medium/pl_PL-darkman-medium.onnx.json", "pl_PL-darkman-medium.onnx.json"),
    # Tiếng Hà Lan
    ("nl/nl_NL/mls_5809/low/nl_NL-mls_5809-low.onnx", "nl_NL-mls_5809-low.onnx"),
    ("nl/nl_NL/mls_5809/low/nl_NL-mls_5809-low.onnx.json", "nl_NL-mls_5809-low.onnx.json"),
    # Tiếng Hungary
    ("hu/hu_HU/imre/medium/hu_HU-imre-medium.onnx", "hu_HU-imre-medium.onnx"),
    ("hu/hu_HU/imre/medium/hu_HU-imre-medium.onnx.json", "hu_HU-imre-medium.onnx.json"),
    # Tiếng Romania
    ("ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx", "ro_RO-mihai-medium.onnx"),
    ("ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx.json", "ro_RO-mihai-medium.onnx.json"),
    # Tiếng Hy Lạp
    ("el/el_GR/rapunzelina/low/el_GR-rapunzelina-low.onnx", "el_GR-rapunzelina-low.onnx"),
    ("el/el_GR/rapunzelina/low/el_GR-rapunzelina-low.onnx.json", "el_GR-rapunzelina-low.onnx.json"),
    # Tiếng Séc
    ("cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx", "cs_CZ-jirka-medium.onnx"),
    ("cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx.json", "cs_CZ-jirka-medium.onnx.json"),
    # Tiếng Thụy Điển
    ("sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx", "sv_SE-nst-medium.onnx"),
    ("sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx.json", "sv_SE-nst-medium.onnx.json"),
    # Tiếng Ả Rập
    ("ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx", "ar_JO-kareem-medium.onnx"),
    ("ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx.json", "ar_JO-kareem-medium.onnx.json"),
    # Tiếng Hindi
    ("hi/hi_IN/sangita/x-low/hi_IN-sangita-x-low.onnx", "hi_IN-sangita-x-low.onnx"),
    ("hi/hi_IN/sangita/x-low/hi_IN-sangita-x-low.onnx.json", "hi_IN-sangita-x-low.onnx.json"),
]

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        logger.info(f"  → Đã có: {os.path.basename(dest_path)}, bỏ qua")
        return True

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    logger.info(f"  ↓ Đang tải: {os.path.basename(dest_path)}")

    try:
        response = requests.get(url, stream=True, timeout=120)
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
        logger.info(f"  ✓ Tải xong: {os.path.basename(dest_path)}")
        return True

    except Exception as e:
        logger.error(f"  ✗ Lỗi: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False

def main():
    logger.info(f"Thư mục voices: {VOICES_DIR}")
    os.makedirs(VOICES_DIR, exist_ok=True)

    total = len(VOICES)
    success = 0
    failed = []

    for i, (voice_path, filename) in enumerate(VOICES, 1):
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
        print(f"\nThất bại ({len(failed)}):")
        for v in failed:
            print(f"  - {v}")
    else:
        print("Tất cả voices đã sẵn sàng!")
    print(f"\nVoices lưu tại: {VOICES_DIR}")

if __name__ == "__main__":
    main()