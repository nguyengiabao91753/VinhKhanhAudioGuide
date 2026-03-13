import type { PoiDto } from '../../entities/poi';
import { apiGet } from './apiClient';

export async function fetchPois(): Promise<PoiDto[]> {
  try {
    return await apiGet<PoiDto[]>('/pois');
  } catch (err) {
    console.log('Using mock data (API unavailable).', err);
    return getMockPois();
  }
}

/* Mock data (short) */
function getMockPois(): PoiDto[] {
  return [
    {
      id: 'poi-1',
      order: 1,
      range: 50,
      thumbnail: 'https://via.placeholder.com/100?text=POI+1',
      banner: 'https://via.placeholder.com/400?text=POI+1+Banner',
      position: { type: 'Point', lat: 10.75305, lng: 106.71335 },
      localizedData: [
        { langCode: 'vi', name: 'Ốc Oanh', description: 'Quán ốc...', descriptionText: 'Ốc Oanh', descriptionAudio: '' },
        { langCode: 'en', name: 'Oc Oanh', description: 'Seafood place...', descriptionText: 'Oc Oanh', descriptionAudio: '' }
      ]
    },
    /* add more mock if needed */
  ];
}
