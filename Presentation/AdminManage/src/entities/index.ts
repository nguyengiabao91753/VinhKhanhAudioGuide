/**
 * Point of Interest DTO
 * Represents a location along the audio tour route
 */
export interface LocalizedData {
  langCode: string;
  name: string;
  description: string;
  descriptionText: string;
  descriptionAudio: string;
}

export interface Position {
  type: string; // e.g., "Point"
  lat: number;
  lng: number;
}

export interface PoiDto {
  id: string;
  order: number;
  range: number; // Detection radius in meters
  thumbnail: string | null;
  banner: string | null;
  position: Position;
  localizedData: LocalizedData[];
}
