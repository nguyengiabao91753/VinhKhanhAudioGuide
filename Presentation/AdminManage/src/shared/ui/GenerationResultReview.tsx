import { useState, useEffect } from "react";
import type { LocalizedContent } from "@/entities/poi/api/poiApi";
import { Modal } from "./Modal";

type GenerationResultReviewProps = {
  open: boolean;
  content: LocalizedContent[];
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export function GenerationResultReview({
  open,
  content,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: GenerationResultReviewProps) {
  const [selectedLang, setSelectedLang] = useState<string>(
    content[0]?.langCode || "",
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedContent = content.find((c) => c.langCode === selectedLang);

  // Debug: Log all content when modal opens
  useEffect(() => {
    if (open && content && content.length > 0) {
      console.log("=== GenerationResultReview.tsx ===");
      console.log("Total languages:", content.length);
      console.log("Full content received:", JSON.stringify(content, null, 2));
      content.forEach((item, idx) => {
        const hasBase64 = item.audioBase64 ? "✓ base64" : "✗ no base64";
        const hasUrl = item.audioUrl ? "✓ url" : "✗ no url";
        console.log(
          `[${idx}] ${item.langCode}: "${item.translatedText.substring(0, 30)}..." | Audio: ${hasBase64} ${hasUrl}`,
        );
      });
    }
  }, [open, content]);

  const playAudio = async () => {
    if (!selectedContent) {
      console.warn("No content selected");
      return;
    }

    // Support both audioBase64 (preview) and audioUrl (after upload to Cloudinary)
    const audioSource = selectedContent.audioBase64
      ? `data:audio/wav;base64,${selectedContent.audioBase64}`
      : selectedContent.audioUrl;

    if (!audioSource) {
      console.warn("No audio source available for:", selectedLang);
      console.warn("audioBase64:", selectedContent.audioBase64 ? "✓" : "✗");
      console.warn("audioUrl:", selectedContent.audioUrl ? "✓" : "✗");
      return;
    }

    setIsPlaying(true);
    try {
      const sourceType = selectedContent.audioBase64
        ? "base64 preview"
        : "Cloudinary URL";
      console.log(`Playing audio from ${sourceType} for ${selectedLang}`);
      const audio = new Audio(audioSource);

      audio.addEventListener("ended", () => {
        console.log("Audio playback ended");
        setIsPlaying(false);
      });

      audio.addEventListener("error", (evt) => {
        console.error("Audio playback error:", evt);
        console.error("Source type:", sourceType);
        setIsPlaying(false);
      });

      await audio.play();
    } catch (error) {
      console.error("Failed to initiate audio playback:", error);
      setIsPlaying(false);
    }
  };

  return (
    <Modal open={open} onClose={onCancel}>
      <div className="generation-review-modal">
        <h2>🌍 Xem trước nội dung sinh tạo</h2>

        <div className="language-tabs">
          {content.map((item) => (
            <button
              key={item.langCode}
              className={`language-tab ${selectedLang === item.langCode ? "active" : ""}`}
              onClick={() => setSelectedLang(item.langCode)}>
              {item.langCode.toUpperCase()}
            </button>
          ))}
        </div>

        {selectedContent && (
          <div className="content-preview">
            <div className="preview-section">
              <label className="preview-label">Văn bản đã dịch:</label>
              <div className="preview-text">
                {selectedContent.translatedText}
              </div>
            </div>

            {(selectedContent.audioBase64 || selectedContent.audioUrl) && (
              <div className="preview-section">
                <label className="preview-label">Audio:</label>
                <div className="audio-player">
                  <button
                    className="play-button"
                    onClick={playAudio}
                    disabled={isPlaying}>
                    {isPlaying ? "⏸ Đang phát..." : "▶ Nghe audio"}
                  </button>
                  <span className="audio-url-hint">
                    {selectedContent.audioBase64
                      ? "📝 Preview - chưa upload"
                      : "✓ Đã upload lên CDN"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button
            className="modal-button cancel"
            onClick={onCancel}
            disabled={isSubmitting}>
            Chỉnh sửa
          </button>
          <button
            className="modal-button confirm"
            onClick={onConfirm}
            disabled={isSubmitting}>
            {isSubmitting ? "Đang lưu..." : "✓ Xác nhận & Lưu"}
          </button>
        </div>
      </div>

      <style>{`
        .generation-review-modal {
          padding: 24px;
          background: white;
          border-radius: 8px;
          max-width: 600px;
        }

        .generation-review-modal h2 {
          margin: 0 0 20px 0;
          font-size: 18px;
          color: #333;
        }

        .language-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .language-tab {
          padding: 8px 16px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .language-tab:hover {
          border-color: #4a90e2;
          color: #4a90e2;
        }

        .language-tab.active {
          background: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }

        .content-preview {
          background: #f9f9f9;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .preview-section {
          margin-bottom: 16px;
        }

        .preview-section:last-child {
          margin-bottom: 0;
        }

        .preview-label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .preview-text {
          background: white;
          padding: 12px;
          border-radius: 4px;
          border-left: 4px solid #4a90e2;
          color: #555;
          line-height: 1.5;
          max-height: 200px;
          overflow-y: auto;
        }

        .audio-player {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .play-button {
          padding: 8px 16px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .play-button:hover:not(:disabled) {
          background: #357abd;
        }

        .play-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .audio-url-hint {
          color: #4a90e2;
          font-size: 13px;
          font-weight: 500;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-button {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          font-size: 14px;
        }

        .modal-button.cancel {
          background: #f0f0f0;
          color: #333;
        }

        .modal-button.cancel:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .modal-button.confirm {
          background: #4a90e2;
          color: white;
        }

        .modal-button.confirm:hover:not(:disabled) {
          background: #357abd;
        }

        .modal-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </Modal>
  );
}
