import { useState } from "react";
import { poiApi } from "@/entities/poi/api/poiApi";
import type { Poi, PoiFormPayload } from "@/entities/poi/model/types";
import { toastError, toastSuccess } from "@/shared/ui";
import { MapPicker } from "@/shared/ui/MapPicker";

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
  const [address, setAddress] = useState(viData?.descriptionText || "");
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
        descriptionText: address,
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

  return (
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

          <label className="form-label">Mô tả ngắn</label>
          <textarea
            className="app-input app-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập mô tả ngắn về địa điểm..."
            rows={4}
          />

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
                onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
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
        </div>

        {error && <div className="form-error">Lỗi: {error}</div>}
      </form>
      <div className="form-actions">
        <button
          className="form-action-button form-action-cancel"
          type="button"
          onClick={onCancel}>
          Hủy
        </button>

        <button
          className="form-action-button form-action-save"
          type="submit"
          form="edit-poi-form"
          disabled={submitting || !name.trim() || lat === 0 || lng === 0}>
          {submitting ? "Đang lưu..." : "💾 Lưu POI"}
        </button>
      </div>
    </div>
  );
}
