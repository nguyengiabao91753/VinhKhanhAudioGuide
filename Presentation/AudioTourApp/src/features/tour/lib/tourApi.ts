import type { TourDto } from '../../../entities/tour';
import { apiGet } from '../../../shared/lib/apiClient';

export async function fetchTours(): Promise<TourDto[]> {
  try {
    const res = await apiGet<unknown>('/tours');
    if (Array.isArray(res)) {
      return res as TourDto[];
    }
    if (res && typeof res === 'object' && 'data' in res) {
      return (res as { data: TourDto[] }).data;
    }
    return [];
  } catch (err) {
    console.log('Tours API unavailable, using mock data.', err);
    return getMockTours();
  }
}

export async function fetchTourById(tourId: string): Promise<TourDto | null> {
  try {
    if (!tourId) return null;
    const res = await apiGet<unknown>(`/tours/${tourId}`);
    if (res && typeof res === 'object' && 'data' in res) {
      return (res as { data: TourDto }).data ?? null;
    }
    return (res as TourDto) ?? null;
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
