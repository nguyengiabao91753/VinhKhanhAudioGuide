import { useState } from "react";
import {
  poiApi,
  multilingualApi,
  type LocalizedContent,
} from "@/entities/poi/api/poiApi";
import type { PoiFormPayload } from "@/entities/poi/model/types";
import { toastError, toastSuccess } from "@/shared/ui";
import { MapPicker } from "@/shared/ui/MapPicker";
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_SELECTED_LANGUAGES,
  getLanguageName,
} from "@/shared/config/languages";
import { GenerationProgress } from "@/shared/ui/GenerationProgress";
import { GenerationResultReview } from "@/shared/ui/GenerationResultReview";

type CreatePoiFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CreatePoiForm({ onSuccess, onCancel }: CreatePoiFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Basic POI fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("MAIN");
  const [range, setRange] = useState(10);
  const [lat, setLat] = useState(10.7612);
  const [lng, setLng] = useState(106.7012);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Multilingual generation
  const [inputMode, setInputMode] = useState<"text" | "audio">("text");
  const [description, setDescription] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    DEFAULT_SELECTED_LANGUAGES,
  );

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [currentGeneratingLang, setCurrentGeneratingLang] = useState("");

  // Generated content
  const [generatedContent, setGeneratedContent] = useState<LocalizedContent[]>(
    [],
  );
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setAddress("");
    setCategory("MAIN");
    setRange(10);
    setLat(10.7612);
    setLng(106.7012);
    setThumbnailFile(null);
    setBannerFile(null);
    setError("");
    setInputMode("text");
    setAudioFile(null);
    setSelectedLanguages(DEFAULT_SELECTED_LANGUAGES);
    setGeneratedContent([]);
    setTranscribedText("");
  };

  const handleCancel = () => {
    if (submitting || isGenerating) return;
    resetForm();
    onCancel?.();
  };

  const handleGenerateMultilingual = async () => {
    if (inputMode === "text" && !description.trim()) {
      toastError("Vui lòng nhập mô tả");
      return;
    }

    if (inputMode === "audio" && !audioFile) {
      toastError("Vui lòng chọn file audio");
      return;
    }

    if (selectedLanguages.length === 0) {
      toastError("Vui lòng chọn ít nhất một ngôn ngữ");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedContent([]);
    setError("");

    try {
      if (inputMode === "text") {
        setGenerationStatus("Đang sinh tạo nội dung đa ngôn ngữ...");
        setCurrentGeneratingLang("");

        const response = await multilingualApi.generateFromText(
          description,
          "vi",
          selectedLanguages,
        );

        console.log("=== MultilingualAPI Response (Text Mode) ===", response);

        if (response?.data) {
          console.log("Setting generated content:", response.data);
          setGeneratedContent(response.data);
          setGenerationProgress(100);
          setShowReviewModal(true);
        } else {
          toastError("Không thể sinh nội dung");
        }
      } else {
        // Audio mode
        setGenerationStatus("Đang phiên âm audio...");
        setCurrentGeneratingLang("STT");

        const response = await multilingualApi.generateFromAudio(
          audioFile!,
          selectedLanguages,
        );

        console.log("=== MultilingualAPI Response (Audio Mode) ===", response);

        if (response?.data) {
          setTranscribedText(response.transcribedText || "");
          console.log("Setting generated content:", response.data);
          setGeneratedContent(response.data);
          setGenerationProgress(100);
          setShowReviewModal(true);
        } else {
          toastError("Không thể sinh nội dung từ audio");
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lỗi sinh tạo nội dung";
      setError(message);
      toastError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmAndSubmit = async () => {
    if (!name.trim()) {
      toastError("Vui lòng nhập tên POI");
      return;
    }

    if (generatedContent.length === 0) {
      toastError("Không có nội dung để lưu");
      return;
    }

    setSubmitting(true);
    setShowReviewModal(false);

    try {
      const payload: PoiFormPayload = {
        order: 0,
        range,
        position: {
          type: "Point",
          lat,
          lng,
        },
        localizedData: generatedContent.map((content) => ({
          langCode: content.langCode,
          name,
          description: description,
          descriptionText: content.translatedText,
          descriptionAudio: content.audioBase64 || content.audioUrl || "",
        })),
        thumbnailFile,
        bannerFile,
      };

      // console.log("=== POI Create Payload ===", {
      //   poiName: name,
      //   localizedDataCount: payload.localizedData.length,
      //   localizedData: generatedContent.map((content) => ({
      //     langCode: content.langCode,
      //     name,
      //     description: description, // text gốc tiếng Việt (input của user)
      //     descriptionText: content.translatedText, // text đã dịch theo ngôn ngữ
      //     descriptionAudio: content.audioBase64 || content.audioUrl || "",
      //   })),
      // });

      await poiApi.create(payload);
      resetForm();
      toastSuccess(`Đã tạo POI "${name}" thành công.`);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo POI";
      setError(message);
      toastError(message);
      setShowReviewModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLanguage = (langCode: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langCode)
        ? prev.filter((l) => l !== langCode)
        : [...prev, langCode],
    );
  };

  const selectAllLanguages = () => {
    setSelectedLanguages(SUPPORTED_LANGUAGES.map((l) => l.code));
  };

  const deselectAllLanguages = () => {
    setSelectedLanguages([]);
  };

  return (
    <>
      <div className="form-wrapper poi-form-wrapper">
        <form className="form-grid poi-form-grid">
          <div className="form-column poi-form-left">
            {/* POI Basic Info */}
            <label className="form-label">Tên POI</label>
            <input
              className="app-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Ốc Oanh"
              required
            />

            <label className="form-label">Danh mục</label>
            <select
              className="app-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}>
              <option value="MAIN">Điểm chính (MAIN)</option>
              <option value="WC">WC</option>
              <option value="TICKET">Bán vé (TICKET)</option>
              <option value="PARKING">Gửi xe (PARKING)</option>
              <option value="BOAT">Bến thuyền (BOAT)</option>
            </select>

            {/* Description Mode Toggle */}
            <label className="form-label">Mô tả POI</label>
            <div className="input-mode-toggle">
              <button
                type="button"
                className={`mode-button ${inputMode === "text" ? "active" : ""}`}
                onClick={() => {
                  setInputMode("text");
                  setAudioFile(null);
                }}>
                📝 Nhập text
              </button>
              <button
                type="button"
                className={`mode-button ${inputMode === "audio" ? "active" : ""}`}
                onClick={() => {
                  setInputMode("audio");
                  setDescription("");
                }}>
                🎤 Upload MP3
              </button>
            </div>

            {/* Input Fields */}
            {inputMode === "text" ? (
              <textarea
                className="app-input app-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả chi tiết về địa điểm..."
                rows={5}
              />
            ) : (
              <>
                <input
                  className="app-input"
                  type="file"
                  accept="audio/mp3,.mp3"
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                />
                {audioFile && (
                  <div className="file-selected">✓ {audioFile.name}</div>
                )}
              </>
            )}

            <label className="form-label">Địa chỉ</label>
            <input
              className="app-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="212 Vĩnh Khánh, Quận 4"
            />

            <label className="form-label">Bán kính (m)</label>
            <input
              className="app-input"
              type="number"
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
              placeholder="Range"
            />

            <div className="form-row">
              <div>
                <label className="form-label">Latitude</label>
                <input
                  className="app-input"
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  placeholder="Latitude"
                  required
                />
              </div>

              <div>
                <label className="form-label">Longitude</label>
                <input
                  className="app-input"
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  placeholder="Longitude"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-column poi-form-right">
            {/* Map Panel */}
            <div className="map-panel">
              <div className="map-panel-header">
                <span>Vị trí trên bản đồ</span>
                <span className="map-coordinates">
                  LAT: {lat.toFixed(4)} · LNG: {lng.toFixed(4)}
                </span>
              </div>
              <MapPicker
                lat={lat}
                lng={lng}
                onChange={({ lat, lng }) => {
                  setLat(lat);
                  setLng(lng);
                }}
              />
              <p className="map-hint">
                * Click trực tiếp lên bản đồ để cập nhật vị trí chính xác.
              </p>
            </div>

            {/* Image Upload Panel */}
            <div className="upload-panel">
              <div>
                <label className="form-label">Ảnh thumbnail</label>
                <input
                  className="app-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setThumbnailFile(e.target.files?.[0] ?? null)
                  }
                />
              </div>

              <div>
                <label className="form-label">Ảnh banner</label>
                <input
                  className="app-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Language Selection Panel */}
            <div className="language-selection-panel">
              <div className="language-header">
                <label className="form-label">
                  🌍 Ngôn ngữ (chọn ngôn ngữ muốn sinh)
                </label>
                <div className="language-actions">
                  <button
                    type="button"
                    className="language-action-link"
                    onClick={selectAllLanguages}>
                    Chọn tất cả
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    className="language-action-link"
                    onClick={deselectAllLanguages}>
                    Bỏ chọn
                  </button>
                </div>
              </div>
              <div className="language-grid">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <label key={lang.code} className="language-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(lang.code)}
                      onChange={() => toggleLanguage(lang.code)}
                    />
                    <span>{lang.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="form-error">⚠️ {error}</div>}
        </form>

        <div className="form-actions">
          <button
            className="form-action-button form-action-cancel"
            type="button"
            onClick={handleCancel}
            disabled={submitting || isGenerating}>
            Hủy
          </button>

          <button
            className="form-action-button form-action-generate"
            type="button"
            onClick={handleGenerateMultilingual}
            disabled={
              submitting ||
              isGenerating ||
              !name.trim() ||
              (inputMode === "text" ? !description.trim() : !audioFile) ||
              selectedLanguages.length === 0 ||
              lat === 0 ||
              lng === 0
            }>
            {isGenerating
              ? "⏳ Đang sinh tạo..."
              : "🚀 Sinh nội dung đa ngôn ngữ"}
          </button>
        </div>
      </div>

      {/* Generation Progress Modal */}
      <GenerationProgress
        open={isGenerating}
        progress={generationProgress}
        currentLanguage={currentGeneratingLang}
        status={generationStatus}
      />

      {/* Review Modal */}
      <GenerationResultReview
        open={showReviewModal}
        content={generatedContent}
        onCancel={() => setShowReviewModal(false)}
        onConfirm={handleConfirmAndSubmit}
        isSubmitting={submitting}
      />

      <style>{`
        .input-mode-toggle {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .mode-button {
          flex: 1;
          padding: 10px 16px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .mode-button:hover {
          border-color: #4a90e2;
          color: #4a90e2;
        }

        .mode-button.active {
          background: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }

        .file-selected {
          color: #4a90e2;
          font-size: 13px;
          margin-top: -8px;
          margin-bottom: 16px;
          font-weight: 500;
        }

        .language-selection-panel {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 16px;
          background: #fafafa;
        }

        .language-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .form-label {
          margin-bottom: 0;
        }

        .language-actions {
          display: flex;
          gap: 8px;
          font-size: 13px;
        }

        .language-action-link {
          background: none;
          border: none;
          color: #4a90e2;
          cursor: pointer;
          padding: 0;
          font-weight: 500;
          transition: color 0.2s;
        }

        .language-action-link:hover {
          color: #357abd;
          text-decoration: underline;
        }

        .language-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .language-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          padding: 6px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .language-checkbox:hover {
          background: white;
        }

        .language-checkbox input {
          cursor: pointer;
        }

        .form-action-generate {
          background: #10a37f;
          color: white;
        }

        .form-action-generate:hover:not(:disabled) {
          background: #0d8e6f;
        }

        .form-action-generate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
