import type { PoiDto } from '../dto/PoiDto';

/**
 * API Service for fetching POI data
 * In production, replace API_ENDPOINT with your actual backend URL
 */

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001/api';

/**
 * Fetch all POIs for the audio tour
 */
export async function fetchPois(): Promise<PoiDto[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_ENDPOINT}/pois`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`API returned status ${response.status}. Using mock data.`);
      return getMockPois();
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Network error or timeout - use mock data for development
    console.log('Using mock data (API unavailable). In production, ensure API_ENDPOINT is configured.');
    return getMockPois();
  }
}

/**
 * Mock POI data for development
 */
function getMockPois(): PoiDto[] {
  return [
    {
      id: 'poi-1',
      order: 1,
      range: 50,
      thumbnail: 'https://via.placeholder.com/100?text=POI+1',
      banner: 'https://via.placeholder.com/400?text=POI+1+Banner',
      position: {
        type: 'Point',
        lat: 21.0285,
        lng: 105.8542,
      },
      localizedData: [
        {
          langCode: 'en',
          name: 'Hoan Kiem Lake',
          description: 'Historic lake in the heart of Hanoi',
          descriptionText: 'Hoan Kiem Lake, also known as Sword Lake, is a freshwater lake in the center of Hanoi, Vietnam. It has a total area of around 17.6 hectares.',
          descriptionAudio: '',
        },
        {
          langCode: 'vi',
          name: 'Hồ Hoàn Kiếm',
          description: 'Hồ lịch sử ở trung tâm Hà Nội',
          descriptionText: 'Hồ Hoàn Kiếm, còn được gọi là Hồ Gươm, là một hồ nước ngọt ở trung tâm Hà Nội, Việt Nam.',
          descriptionAudio: '',
        },
      ],
    },
    {
      id: 'poi-2',
      order: 2,
      range: 40,
      thumbnail: 'https://via.placeholder.com/100?text=POI+2',
      banner: 'https://via.placeholder.com/400?text=POI+2+Banner',
      position: {
        type: 'Point',
        lat: 21.0292,
        lng: 105.8516,
      },
      localizedData: [
        {
          langCode: 'en',
          name: 'St. Josephs Cathedral',
          description: 'Historic cathedral in Hanoi',
          descriptionText: 'St. Josephs Cathedral is a minor basilica and parish church in Hanoi, Vietnam.',
          descriptionAudio: '',
        },
        {
          langCode: 'vi',
          name: 'Nhà thờ Lớn',
          description: 'Nhà thờ lịch sử ở Hà Nội',
          descriptionText: 'Nhà thờ Lớn là một nhà thờ nhỏ ở trung tâm Hà Nội, Việt Nam.',
          descriptionAudio: '',
        },
      ],
    },
    {
      id: 'poi-3',
      order: 3,
      range: 50,
      thumbnail: 'https://via.placeholder.com/100?text=POI+3',
      banner: 'https://via.placeholder.com/400?text=POI+3+Banner',
      position: {
        type: 'Point',
        lat: 21.0279,
        lng: 105.8575,
      },
      localizedData: [
        {
          langCode: 'en',
          name: 'Temple of Literature',
          description: 'Ancient temple and university',
          descriptionText: 'The Temple of Literature is a temple located in the Old Quarter of Hanoi, Vietnam.',
          descriptionAudio: '',
        },
        {
          langCode: 'vi',
          name: 'Văn Miếu - Quốc Tử Giám',
          description: 'Đền cổ và trường đại học',
          descriptionText: 'Văn Miếu - Quốc Tử Giám là một đền thờ ở Hà Nội, Việt Nam.',
          descriptionAudio: '',
        },
      ],
    },
  ];
}
