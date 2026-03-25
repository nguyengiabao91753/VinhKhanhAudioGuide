export type PoiLocalizedData = {
  langCode: string;
  name: string;
  description: string;
  descriptionText: string;
  descriptionAudio: string;
};

export type PoiPosition = {
  type: string;
  lat: number;
  lng: number;
};

export type Poi = {
  id: string;
  order: number;
  range: number;
  thumbnail: string | null;
  banner: string | null;
  position: PoiPosition;
  localizedData: PoiLocalizedData[];
};

export type PoiFormPayload = {
  order: number;
  range: number;
  position: PoiPosition;
  localizedData: PoiLocalizedData[];
  thumbnailFile?: File | null;
  bannerFile?: File | null;
  // URL ảnh cũ — truyền lên khi update mà không đổi ảnh mới
  existingThumbnail?: string | null;
  existingBanner?: string | null;
};
