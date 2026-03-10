import type { LocalizedData } from '../poi';

/**
 * Tour DTO - Represents an audio tour package
 */
export interface TourDto {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  distance: number; // km
  thumbnail: string;
  banner: string;
  poiIds: string[]; // ordered list of POI IDs
  localizedData: LocalizedData[];
}
