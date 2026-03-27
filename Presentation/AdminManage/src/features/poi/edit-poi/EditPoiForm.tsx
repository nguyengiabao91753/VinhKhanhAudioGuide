import { useState } from "react";
import {
  poiApi,
  multilingualApi,
  type LocalizedContent,
} from "@/entities/poi/api/poiApi";
import type { Poi, PoiFormPayload } from "@/entities/poi/model/types";
import { toastError, toastSuccess } from "@/shared/ui";
import { MapPicker } from "@/shared/ui/MapPicker";
import {
  DEFAULT_SELECTED_LANGUAGES,
  SUPPORTED_LANGUAGES,
} from "@/shared/config/languages";
import { GenerationProgress } from "@/shared/ui/GenerationProgress";
import { GenerationResultReview } from "@/shared/ui/GenerationResultReview";

// Helper: check nếu giá trị là category keyword (không phải audio URL)
const isCategoryValue = (value?: string) =>
  value === "MAIN" ||
  value === "WC" ||
  value === "TICKET" ||
  value === "PARKING" ||
  value === "BOAT";

const hasValidAudio = (audioUrl?: string) =>
  !!audioUrl && !isCategoryValue(audioUrl);

type EditPoiFormProps = {
  poi: Poi;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function EditPoiForm({ poi, onSuccess, onCancel }: EditPoiFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const viData =
    poi.localizedData.find((item) => item.langCode === "vi") ??
    poi.localizedData[0];

  const [name, setName] = useState(viData?.name || "");
  const [description, setDescription] = useState(viData?.description || "");
  // address không có trong DB, để trống
  const [category, setCategory] = useState(
    isCategoryValue(viData?.descriptionAudio)
      ? viData?.descriptionAudio || "MAIN"
      : "MAIN",
  );
  const [range, setRange] = useState(poi.range);
  const [lat, setLat] = useState(poi.position.lat);
  const [lng, setLng] = useState(poi.position.lng);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // --- Trans preview panel state ---
  const [previewLang, setPreviewLang] = useState<string>(
    poi.localizedData[0]?.langCode || "",
  );
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [deletedLanguages, setDeletedLanguages] = useState<Set<string>>(
    new Set(),
  );

  // Regeneration
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    poi.localizedData.map((l) => l.langCode),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generatedContent, setGeneratedContent] = useState<LocalizedContent[]>(
    [],
  );
  const [showReviewModal, setShowReviewModal] = useState(false);

  // --- Play audio from existing DB URL ---
  const playExistingAudio = (audioUrl: string, langCode: string) => {
    if (!hasValidAudio(audioUrl)) return;
    setPlayingLang(langCode);
    const audio = new Audio(audioUrl);
    audio.addEventListener("ended", () => setPlayingLang(null));
    audio.addEventListener("error", () => setPlayingLang(null));
    audio.play().catch(() => setPlayingLang(null));
  };

  const handleRegenerateMultilingual = async () => {
    if (!description.trim()) {
      toastError("Vui lòng nhập mô tả");
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
      setGenerationStatus("Đang sinh tạo nội dung đa ngôn ngữ...");

      const response = await multilingualApi.generateFromText(
        description,
        "vi",
        selectedLanguages,
      );

      if (response?.data) {
        setGeneratedContent(response.data);
        setShowReviewModal(true);
      } else {
        toastError("Không thể sinh nội dung");
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

  const handleConfirmRegeneration = async () => {
    if (generatedContent.length === 0) {
      toastError("Không có nội dung để lưu");
      return;
    }

    setSubmitting(true);
    setShowReviewModal(false);

    try {
      const payload: PoiFormPayload = {
        order: poi.order,
        range,
        position: {
          ...poi.position,
          lat,
          lng,
        },
        localizedData: generatedContent.map((content) => ({
          langCode: content.langCode,
          name,
          description: description, // text gốc tiếng Việt
          descriptionText: content.translatedText, // text đã dịch theo ngôn ngữ
          descriptionAudio: content.audioBase64 || content.audioUrl || "",
        })),
        thumbnailFile,
        bannerFile,
      };

      await poiApi.update(poi.id, payload);
      toastSuccess(`Đã cập nhật POI "${name}" thành công.`);
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể cập nhật POI";
      setError(message);
      toastError(message);
      setShowReviewModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLanguage = async (langCode: string) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bản dịch "${langCode.toUpperCase()}" không?\n\nHành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    try {
      await poiApi.deleteLocalizedData(poi.id, langCode);
      setDeletedLanguages((prev) => {
        const updated = new Set(prev);
        updated.add(langCode);
        return updated;
      });
      setSelectedLanguages((prev) => prev.filter((l) => l !== langCode));
      if (previewLang === langCode && poi.localizedData.length > 1) {
        const nextLang = poi.localizedData.find(
          (item) =>
            item.langCode !== langCode && !deletedLanguages.has(item.langCode),
        )?.langCode;
        if (nextLang) setPreviewLang(nextLang);
      }
      toastSuccess(`Đã xóa bản dịch "${langCode.toUpperCase()}" thành công.`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : `Không thể xóa bản dịch "${langCode}"`;
      toastError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError("");

    const payload: PoiFormPayload = {
      order: poi.order,
      range,
      position: {
        ...poi.position,
        lat,
        lng,
      },
      localizedData: poi.localizedData
        .filter((item) => !deletedLanguages.has(item.langCode))
        .map((item) => ({
          ...item,
          name,
          description,
          descriptionText: item.descriptionText,
          descriptionAudio: item.descriptionAudio,
        })),
      thumbnailFile,
      bannerFile,
    };

    try {
      await poiApi.update(poi.id, payload);
      toastSuccess(`Đã cập nhật POI "${name}" thành công.`);
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể cập nhật POI";
      setError(message);
      toastError(message);
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

  const selectedPreviewData = poi.localizedData.find(
    (item) => item.langCode === previewLang,
  );

  return (
    <>
      <div className="form-wrapper poi-form-wrapper">
        <form
          id="edit-poi-form"
          onSubmit={handleSubmit}
          className="form-grid poi-form-grid">
          <div className="form-column poi-form-left">
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

            <label className="form-label">Mô tả ngắn (tiếng Việt)</label>
            <textarea
              className="app-input app-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết về địa điểm bằng tiếng Việt..."
              rows={4}
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

            {/* ── SECTION: Xem trans hiện có trong DB ── */}
            <div className="trans-preview-panel">
              <div className="trans-preview-header">
                <span className="trans-preview-title">
                  🌍 Nội dung dịch hiện tại trong DB
                </span>
                <span className="trans-preview-badge">
                  {poi.localizedData.length} ngôn ngữ
                </span>
              </div>

              {poi.localizedData.length === 0 ? (
                <p className="trans-preview-empty">Chưa có bản dịch nào.</p>
              ) : (
                <>
                  <div className="trans-lang-tabs">
                    {poi.localizedData
                      .filter((item) => !deletedLanguages.has(item.langCode))
                      .map((item) => (
                        <div
                          key={item.langCode}
                          className="trans-lang-tab-container">
                          <button
                            type="button"
                            className={`trans-lang-tab ${previewLang === item.langCode ? "active" : ""}`}
                            onClick={() => setPreviewLang(item.langCode)}>
                            {item.langCode.toUpperCase()}
                          </button>
                          <button
                            type="button"
                            className="trans-delete-btn"
                            onClick={() => handleDeleteLanguage(item.langCode)}
                            title="Xóa ngôn ngữ này">
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>

                  {selectedPreviewData &&
                    !deletedLanguages.has(selectedPreviewData.langCode) && (
                      <div className="trans-preview-content">
                        <div className="trans-preview-field">
                          <label className="trans-field-label">
                            📝 Văn bản đã dịch:
                          </label>
                          <div className="trans-field-text">
                            {selectedPreviewData.descriptionText || (
                              <span className="trans-field-empty">
                                (Chưa có)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="trans-preview-field">
                          <label className="trans-field-label">🔊 Audio:</label>
                          {hasValidAudio(
                            selectedPreviewData.descriptionAudio,
                          ) ? (
                            <div className="trans-audio-row">
                              <button
                                type="button"
                                className="trans-play-btn"
                                disabled={
                                  playingLang === selectedPreviewData.langCode
                                }
                                onClick={() =>
                                  playExistingAudio(
                                    selectedPreviewData.descriptionAudio,
                                    selectedPreviewData.langCode,
                                  )
                                }>
                                {playingLang === selectedPreviewData.langCode
                                  ? "⏸ Đang phát..."
                                  : "▶ Nghe audio"}
                              </button>
                              <span className="trans-audio-hint">
                                ✓ Đã có trên CDN
                              </span>
                            </div>
                          ) : (
                            <span className="trans-field-empty">
                              (Chưa có audio)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
            {/* ── END SECTION ── */}
          </div>

          <div className="form-column poi-form-right">
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

            {/* Language Selection for Regeneration */}
            <div className="language-selection-panel">
              <label className="form-label">🔄 Re-trans ngôn ngữ</label>
              <p className="retrans-hint">
                Chọn ngôn ngữ muốn dịch lại, sau đó nhấn "Re-trans ngôn ngữ".
                Nếu không re-trans, hệ thống giữ nguyên bản dịch cũ trong DB.
              </p>
              <div className="language-grid-small">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <label key={lang.code} className="language-checkbox-small">
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(lang.code)}
                      onChange={() => toggleLanguage(lang.code)}
                    />
                    <span>{lang.code}</span>
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
            onClick={onCancel}
            disabled={submitting || isGenerating}>
            Hủy
          </button>

          <button
            className="form-action-button form-action-regenerate"
            type="button"
            onClick={handleRegenerateMultilingual}
            disabled={
              submitting ||
              isGenerating ||
              !description.trim() ||
              selectedLanguages.length === 0
            }>
            {isGenerating ? "⏳ Đang sinh..." : "🔄 Re-trans ngôn ngữ"}
          </button>

          <button
            className="form-action-button form-action-save"
            type="submit"
            form="edit-poi-form"
            disabled={
              submitting ||
              isGenerating ||
              !name.trim() ||
              lat === 0 ||
              lng === 0
            }>
            {submitting ? "Đang lưu..." : "💾 Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* Generation Progress Modal */}
      <GenerationProgress
        open={isGenerating}
        progress={generationProgress}
        status={generationStatus}
      />

      {/* Review Modal */}
      <GenerationResultReview
        open={showReviewModal}
        content={generatedContent}
        onCancel={() => setShowReviewModal(false)}
        onConfirm={handleConfirmRegeneration}
        isSubmitting={submitting}
      />

      <style>{`
        /* ── Trans preview panel ── */
        .trans-preview-panel {
          border: 1px solid #d0e4f7;
          border-radius: 8px;
          padding: 14px;
          background: #f0f7ff;
          margin-top: 4px;
        }

        .trans-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .trans-preview-title {
          font-weight: 600;
          font-size: 13px;
          color: #1a6bbf;
        }

        .trans-preview-badge {
          background: #1a6bbf;
          color: white;
          border-radius: 12px;
          padding: 2px 10px;
          font-size: 11px;
          font-weight: 500;
        }

        .trans-preview-empty {
          color: #999;
          font-size: 13px;
          margin: 0;
        }

        .trans-lang-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          align-items: center;
        }

        .trans-lang-tab-container {
          display: flex;
          align-items: center;
          position: relative;
        }

        .trans-lang-tab-container.deleted {
          opacity: 0.5;
        }

        .trans-lang-tab {
          padding: 5px 12px;
          border: 2px solid #c0d8f0;
          background: white;
          border-radius: 5px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #555;
          transition: all 0.15s;
        }

        .trans-lang-tab:hover:not(:disabled) {
          border-color: #4a90e2;
          color: #4a90e2;
        }

        .trans-lang-tab.active {
          background: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }

        .trans-lang-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          text-decoration: line-through;
        }

        .trans-delete-btn {
          position: absolute;
          right: -6px;
          top: -6px;
          width: 20px;
          height: 20px;
          padding: 0;
          border: none;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .trans-delete-btn:hover {
          background: #dc2626;
          transform: scale(1.15);
        }

        .trans-delete-btn-undo {
          background: #10b981;
        }

        .trans-delete-btn-undo:hover {
          background: #059669;
        }

        .trans-preview-content {
          background: white;
          border-radius: 6px;
          padding: 12px;
          border: 1px solid #d0e4f7;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trans-preview-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .trans-field-label {
          font-size: 12px;
          font-weight: 600;
          color: #444;
        }

        .trans-field-text {
          background: #f9f9f9;
          border-left: 3px solid #4a90e2;
          padding: 8px 10px;
          border-radius: 4px;
          font-size: 13px;
          color: #333;
          line-height: 1.5;
          max-height: 100px;
          overflow-y: auto;
        }

        .trans-field-empty {
          color: #bbb;
          font-style: italic;
          font-size: 12px;
        }

        .trans-audio-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .trans-play-btn {
          padding: 6px 14px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .trans-play-btn:hover:not(:disabled) {
          background: #357abd;
        }

        .trans-play-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .trans-audio-hint {
          color: #27ae60;
          font-size: 12px;
          font-weight: 500;
        }

        /* ── Re-trans hint ── */
        .retrans-hint {
          font-size: 12px;
          color: #888;
          margin: 0 0 10px 0;
          line-height: 1.4;
        }

        /* ── Language selection (unchanged) ── */
        .language-selection-panel {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          background: #fafafa;
        }

        .language-grid-small {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .language-checkbox-small {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .language-checkbox-small input {
          cursor: pointer;
          width: 16px;
        }

        .form-action-regenerate {
          background: #f59e0b;
          color: white;
        }

        .form-action-regenerate:hover:not(:disabled) {
          background: #d97706;
        }

        .form-action-regenerate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
