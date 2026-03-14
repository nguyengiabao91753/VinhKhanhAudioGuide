import { useState } from "react";
import { poiApi } from "@/entities/poi/api/poiApi";
import type { PoiFormPayload } from "@/entities/poi/model/types";
import { toastError, toastSuccess } from "@/shared/ui";
import { MapPicker } from "@/shared/ui/MapPicker";

type CreatePoiFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CreatePoiForm({ onSuccess, onCancel }: CreatePoiFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("MAIN");
  const [range, setRange] = useState(10);
  const [lat, setLat] = useState(10.7612);
  const [lng, setLng] = useState(106.7012);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

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
  };

  const handleCancel = () => {
    if (submitting) return;
    resetForm();
    onCancel?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError("");

    const payload: PoiFormPayload = {
      order: 0,
      range,
      position: {
        type: "Point",
        lat,
        lng,
      },
      localizedData: [
        {
          langCode: "vi",
          name,
          description,
          descriptionText: address,
          descriptionAudio: category,
        },
        {
          langCode: "en",
          name,
          description,
          descriptionText: address,
          descriptionAudio: category,
        },
      ],
      thumbnailFile,
      bannerFile,
    };

    try {
      await poiApi.create(payload);

      resetForm();

      toastSuccess(`Đã tạo POI "${name}" thành công.`);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo POI";
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-wrapper poi-form-wrapper">
      <form
        id="create-poi-form"
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
          form="create-poi-form"
          onClick={handleCancel}>
          Hủy
        </button>
        <button
          className="form-action-button form-action-save"
          type="submit"
          form="create-poi-form"
          disabled={submitting || !name.trim() || lat === 0 || lng === 0}>
          {submitting ? "Đang tạo..." : "💾 Lưu POI"}
        </button>
      </div>
    </div>
  );
}
