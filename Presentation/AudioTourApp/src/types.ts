export type LocalizedString = { vi: string; en: string };

export type POI = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  lat: number;
  lng: number;
  played: boolean;
  imageUrl?: string;
  range?: number;
};

export type Tour = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  poiIds: string[];
  imageUrl?: string;
};
