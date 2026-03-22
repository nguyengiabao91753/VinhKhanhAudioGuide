import { List } from 'lucide-react';
import type { LocalizedData, PoiDto, Position } from '../../entities/poi';
import { apiGet } from './apiClient';

const FALLBACK_POI_THUMB = '';
const FALLBACK_POI_BANNER = '';
const DEFAULT_RANGE_METERS = 30;

type RawPoi = Record<string, unknown>;

function normalizeLocalizedData(raw: unknown, fallbackName: string): LocalizedData[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as LocalizedData[];
  }
  return [
    {
      langCode: 'vi',
      name: fallbackName || 'POI',
      description: '',
      descriptionText: '',
      descriptionAudio: '',
    },
    {
      langCode: 'en',
      name: fallbackName || 'POI',
      description: '',
      descriptionText: '',
      descriptionAudio: '',
    },
  ];
}

function normalizePosition(raw: unknown): Position {
  const position = (raw || {}) as Record<string, unknown>;
  const lat =
    typeof position.lat === 'number'
      ? position.lat
      : typeof position.Lat === 'number'
        ? position.Lat
        : 0;
  const lng =
    typeof position.lng === 'number'
      ? position.lng
      : typeof position.Lng === 'number'
        ? position.Lng
        : 0;
  const type =
    typeof position.type === 'string'
      ? position.type
      : typeof position.Type === 'string'
        ? position.Type
        : 'Point';

  return { type, lat, lng };
}

function normalizePoiDto(raw: RawPoi): PoiDto {
  const id = String(raw.id ?? raw.Id ?? '');
  const orderRaw = raw.order ?? raw.Order;
  const order = typeof orderRaw === 'number' ? orderRaw : 0;
  const rangeRaw = raw.range ?? raw.Range;
  const range =
    typeof rangeRaw === 'number' && Number.isFinite(rangeRaw)
      ? rangeRaw
      : DEFAULT_RANGE_METERS;
  const thumbnailValue =
    typeof raw.thumbnail === 'string'
      ? raw.thumbnail
      : typeof raw.Thumbnail === 'string'
        ? raw.Thumbnail
        : '';
  const thumbnail = thumbnailValue.trim() ? thumbnailValue : FALLBACK_POI_THUMB;
  const bannerValue =
    typeof raw.banner === 'string'
      ? raw.banner
      : typeof raw.Banner === 'string'
        ? raw.Banner
        : '';
  const banner = bannerValue.trim() ? bannerValue : FALLBACK_POI_BANNER;
  const position = normalizePosition(raw.position ?? raw.Position);
  const fallbackName = `POI ${order || 1}`.trim();
  const localizedData = normalizeLocalizedData(
    raw.localizedData ?? raw.LocalizedData,
    fallbackName
  );

  return {
    id: id || `poi-${order || 1}`,
    order,
    range,
    thumbnail,
    banner,
    position,
    localizedData,
  };
}

export async function fetchPois(): Promise<PoiDto[]> {
  try {
    const res = await apiGet<unknown>('/pois');
    const list = Array.isArray(res)
      ? res
      : res && typeof res === 'object' && 'data' in res
        ? (res as { data: unknown[] }).data
        : [];
    return list.map((item) => normalizePoiDto(item as RawPoi));
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
      thumbnail: '',
      banner: '',
      position: { type: 'Point', lat: 10.75305, lng: 106.71335 },
      localizedData: [
        { langCode: 'vi', name: 'Ốc Oanh', description: 'Quán ốc...', descriptionText: 'Ốc Oanh', descriptionAudio: '' },
        { langCode: 'en', name: 'Oc Oanh', description: 'Seafood place...', descriptionText: 'Oc Oanh', descriptionAudio: '' }
      ]
    },
    /* add more mock if needed */
  ];
}