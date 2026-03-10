import type { TourDto } from '../../../entities/tour';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:5000/api';

export async function fetchTours(): Promise<TourDto[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_ENDPOINT}/tours/get-all`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Tours API returned status ${res.status}. Using mock data.`);
      return getMockTours();
    }
    const data = (await res.json()) as TourDto[];
    return data;
  } catch (err) {
    console.log('Tours API unavailable, using mock data.', err);
    return getMockTours();
  }
}

export async function fetchTourById(tourId: string): Promise<TourDto | null> {
  try {
    const tours = await fetchTours();
    return tours.find(t => t.id === tourId) || null;
  } catch (err) {
    console.error('Failed to fetch tour:', err);
    return null;
  }
}

/* Mock Tours Data */
function getMockTours(): TourDto[] {
  return [
    {
      id: 'tour-1',
      name: 'Hành trình Ốc Vịnh Khánh',
      description: 'Khám phá con phố ốc nổi tiếng nhất Sài Gòn với những quán hải sản tươi ngon, nhộn nhịp về đêm.',
      duration: 60,
      distance: 1.2,
      thumbnail: 'https://via.placeholder.com/200?text=Tour+1',
      banner: 'https://via.placeholder.com/800x400?text=Oc+Vinh+Khanh+Banner',
      poiIds: ['poi-1', 'poi-2', 'poi-3'],
      localizedData: [
        {
          langCode: 'vi',
          name: 'Hành trình Ốc Vịnh Khánh',
          description: 'Khám phá con phố ốc nổi tiếng',
          descriptionText: 'Hành trình Ốc Vịnh Khánh',
          descriptionAudio: ''
        },
        {
          langCode: 'en',
          name: 'Vinh Khanh Oyster Journey',
          description: 'Explore the famous oyster street',
          descriptionText: 'Vinh Khanh Oyster Journey',
          descriptionAudio: ''
        }
      ]
    }
  ];
}
