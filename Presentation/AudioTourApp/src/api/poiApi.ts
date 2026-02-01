import type { PoiDto } from '../entities/PoiDto';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:5000/api';

export async function fetchPois(): Promise<PoiDto[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_ENDPOINT}/pois/get-all`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`API returned status ${res.status}. Using mock data.`);
      return getMockPois();
    }
    const data = (await res.json()) as PoiDto[];
    return data;
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
