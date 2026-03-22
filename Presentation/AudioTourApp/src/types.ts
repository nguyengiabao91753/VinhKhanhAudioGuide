export type LocalizedString = { vi: string; en: string };

/** One language entry from the API — mirrors LocalizedData in entities/poi */
export interface PoiLocalizedEntry {
  langCode: string;
  name: string;
  description: string;
  descriptionText: string;
  descriptionAudio: string;
}

export type POI = {
  id: string;
  name: LocalizedString;           // quick-access vi/en for geofence layer
  description: LocalizedString;    // quick-access vi/en for geofence layer
  lat: number;
  lng: number;
  played: boolean;
  imageUrl?: string;
  range?: number;
  priority?: number;
  /** Full multilingual data from API — used by NarrationBanner language picker */
  localizedData?: PoiLocalizedEntry[];
};

export type Tour = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  poiIds: string[];
  imageUrl?: string;
};