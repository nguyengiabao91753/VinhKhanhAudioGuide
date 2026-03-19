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

type EditPoiFormProps = {
  poi: Poi;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const isCategoryValue = (value?: string) =>
  value === "MAIN" ||
  value === "WC" ||
  value === "TICKET" ||
  value === "PARKING" ||
  value === "BOAT";

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
      localizedData: poi.localizedData.map((item) => ({
        ...item,
        name,
        description,
        descriptionText: item.descriptionText, // giữ nguyên text đã dịch
        descriptionAudio: category,
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
              <label className="form-label">🌍 Regenerate ngôn ngữ</label>
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
            {isGenerating ? "⏳ Đang sinh..." : "🔄 Regenerate ngôn ngữ"}
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
