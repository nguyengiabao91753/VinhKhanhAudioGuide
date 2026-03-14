import type { LocalizedData } from '../../../entities/poi';
import type { TourDto } from '../../../entities/tour';
import { apiGet } from '../../../shared/lib/apiClient';

const FALLBACK_TOUR_THUMB = 'https://via.placeholder.com/300?text=Tour';
const FALLBACK_TOUR_BANNER = 'https://via.placeholder.com/900x400?text=Tour+Banner';

type RawTour = Record<string, unknown>;

function normalizeLocalizedData(raw: unknown, fallbackName: string, fallbackDescription: string): LocalizedData[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as LocalizedData[];
  }
  return [
    {
      langCode: 'vi',
      name: fallbackName || 'Tour',
      description: fallbackDescription || '',
      descriptionText: fallbackDescription || '',
      descriptionAudio: '',
    },
    {
      langCode: 'en',
      name: fallbackName || 'Tour',
      description: fallbackDescription || '',
      descriptionText: fallbackDescription || '',
      descriptionAudio: '',
    },
  ];
}

function normalizeTourDto(raw: RawTour): TourDto {
  const id = String(raw.id ?? raw.Id ?? '');
  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.Name === 'string'
        ? raw.Name
        : '';
  const poiIdsRaw = raw.poiIds ?? raw.PoiIds;
  const poiIds = Array.isArray(poiIdsRaw)
    ? poiIdsRaw.map((idValue) => String(idValue))
    : [];

  const descriptionRaw = raw.description ?? raw.Description;
  const description =
    typeof descriptionRaw === 'string'
      ? descriptionRaw
      : '';

  const localizedData = normalizeLocalizedData(
    raw.localizedData ?? raw.LocalizedData,
    name || 'Tour',
    description || name
  );

  const durationRaw = raw.duration ?? raw.Duration;
  const duration = typeof durationRaw === 'number' ? durationRaw : 0;
  const distanceRaw = raw.distance ?? raw.Distance;
  const distance = typeof distanceRaw === 'number' ? distanceRaw : 0;

  const thumbnailValue =
    typeof raw.thumbnail === 'string'
      ? raw.thumbnail
      : typeof raw.Thumbnail === 'string'
        ? raw.Thumbnail
        : '';
  const thumbnail = thumbnailValue.trim() ? thumbnailValue : FALLBACK_TOUR_THUMB;
  const bannerValue =
    typeof raw.banner === 'string'
      ? raw.banner
      : typeof raw.Banner === 'string'
        ? raw.Banner
        : '';
  const banner = bannerValue.trim() ? bannerValue : FALLBACK_TOUR_BANNER;

  return {
    id: id || `tour-${name || 'unknown'}`,
    name: name || localizedData[0]?.name || 'Tour',
    description:
      description ||
      localizedData[0]?.description ||
      localizedData[0]?.descriptionText ||
      name ||
      '',
    duration,
    distance,
    thumbnail,
    banner,
    poiIds,
    localizedData,
  };
}

export async function fetchTours(): Promise<TourDto[]> {
  try {
    const res = await apiGet<unknown>('/tours');
    const list = Array.isArray(res)
      ? res
      : res && typeof res === 'object' && 'data' in res
        ? (res as { data: unknown[] }).data
        : [];
    return list.map((item) => normalizeTourDto(item as RawTour));
  } catch (err) {
    console.log('Tours API unavailable, using mock data.', err);
    return getMockTours().map((item) => normalizeTourDto(item as RawTour));
  }
}

export async function fetchTourById(tourId: string): Promise<TourDto | null> {
  try {
    if (!tourId) return null;
    const res = await apiGet<unknown>(`/tours/${tourId}`);
    if (res && typeof res === 'object' && 'data' in res) {
      const data = (res as { data: unknown }).data;
      return data ? normalizeTourDto(data as RawTour) : null;
    }
    return res ? normalizeTourDto(res as RawTour) : null;
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
