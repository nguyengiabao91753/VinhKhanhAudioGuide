/**
 * AudioGenerationService v3
 * Matches admin flow exactly (from poiApi.ts + EditPoiForm.tsx):
 *
 * 1. POST /multilingual/generate-from-text
 *    { sourceText, sourceLanguage: 'vi', targetLanguages: [lang] }
 *    → { success, data: [{ langCode, translatedText, audioBase64?, audioUrl? }] }
 *
 * 2. Convert audioBase64 → Blob URL for immediate playback
 *
 * 3. Save back to DB via PUT /pois/:id (FormData, same as admin)
 *    descriptionAudio = audioBase64 || audioUrl  (backend uploads to Cloudinary)
 *
 * 4. Update local POI state so next play skips generation
 */

import type { PoiDto, LocalizedData } from '../../../entities/poi';

/** Returns true only for http/https/blob URLs — rejects "MAIN", empty, or other non-URLs */
export function isPlayableUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:');
}

const API_BASE = import.meta.env.VITE_API_ENDPOINT || 'https://localhost:7047/api';
const TIMEOUT_MS = 600_000; // 10 min — same as admin

// "poiId:langCode" → blob URL or https URL
const memCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

export type GenEntry = {
  langCode: string;
  translatedText: string;
  audioBase64?: string;
  audioUrl?: string;
};

type GenResult = { success: boolean; data: GenEntry[] };

// ── Core generation ────────────────────────────────────────────────────────

async function _generate(
  poiId: string,
  sourceText: string,
  targetLang: string,
): Promise<{ url: string | null; entry: GenEntry | null }> {
  const ck = `${poiId}:${targetLang}`;
  if (memCache.has(ck)) return { url: memCache.get(ck)!, entry: null };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Exact same call as admin's multilingualApi.generateFromText
    const res = await fetch(`${API_BASE}/multilingual/generate-from-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceText,
        sourceLanguage: 'vi',
        targetLanguages: [targetLang],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[AudioGen] HTTP ${res.status} for ${targetLang}`);
      return { url: null, entry: null };
    }

    const json: GenResult = await res.json();
    if (!json?.data?.length) return { url: null, entry: null };

    const entry = json.data.find(d => d.langCode === targetLang) ?? json.data[0];

    // audioUrl takes priority (already uploaded to Cloudinary)
    if (entry.audioUrl) {
      memCache.set(ck, entry.audioUrl);
      return { url: entry.audioUrl, entry };
    }

    // audioBase64 → Blob URL (same as admin preview)
    if (entry.audioBase64) {
      const bytes = Uint8Array.from(atob(entry.audioBase64), c => c.charCodeAt(0));
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      memCache.set(ck, blobUrl);
      return { url: blobUrl, entry };
    }

    return { url: null, entry };
  } catch (e) {
    clearTimeout(timer);
    console.warn('[AudioGen] generation error:', e);
    return { url: null, entry: null };
  }
}

/**
 * Save generated audio back to POI in DB.
 * Mirrors admin's handleConfirmRegeneration → poiApi.update()
 * Uses FormData exactly like buildPoiFormData in admin.
 */
async function _saveAudioToDB(poi: PoiDto, entry: GenEntry): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('Order', String(poi.order ?? 0));
    formData.append('Range', String(poi.range ?? 30));
    formData.append('Position.Type', poi.position.type ?? 'Point');
    formData.append('Position.Lat', String(poi.position.lat));
    formData.append('Position.Lng', String(poi.position.lng));

    // Build merged localizedData: existing + new entry
    const existing = poi.localizedData ?? [];
    const hasLang = existing.some(l => l.langCode === entry.langCode);
    const merged: LocalizedData[] = hasLang
      ? existing.map(l =>
          l.langCode === entry.langCode
            ? { ...l, descriptionText: entry.translatedText, descriptionAudio: entry.audioBase64 || entry.audioUrl || l.descriptionAudio }
            : l
        )
      : [
          ...existing,
          {
            langCode: entry.langCode,
            name: existing[0]?.name ?? '',
            description: entry.translatedText,
            descriptionText: entry.translatedText,
            descriptionAudio: entry.audioBase64 || entry.audioUrl || '',
          },
        ];

    merged.forEach((ld, i) => {
      formData.append(`LocalizedData[${i}].LangCode`, ld.langCode);
      formData.append(`LocalizedData[${i}].Name`, ld.name ?? '');
      formData.append(`LocalizedData[${i}].Description`, ld.description ?? '');
      formData.append(`LocalizedData[${i}].DescriptionText`, ld.descriptionText ?? '');
      // Admin saves: descriptionAudio = audioBase64 || audioUrl || ""
      formData.append(`LocalizedData[${i}].DescriptionAudio`, ld.descriptionAudio ?? '');
    });

    await fetch(`${API_BASE}/pois/${poi.id}`, {
      method: 'PUT',
      body: formData,
    });
    console.info(`[AudioGen] Saved audio to DB for POI ${poi.id} lang=${entry.langCode}`);
  } catch (e) {
    console.warn('[AudioGen] Failed to save to DB:', e);
    // Non-blocking — app still plays from cache
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate + cache + save to DB.
 * Returns playable URL or null on failure.
 * Deduped: multiple callers for same poi+lang share one request.
 */
export function generateAudioForPoi(
  poi: PoiDto,
  targetLang: string,
): Promise<string | null> {
  const ck = `${poi.id}:${targetLang}`;
  if (memCache.has(ck)) return Promise.resolve(memCache.get(ck)!);
  if (inFlight.has(ck)) return inFlight.get(ck)!;

  // Source text: always Vietnamese description (same as admin uses description field)
  const viLd = poi.localizedData?.find(l => l.langCode === 'vi') ?? poi.localizedData?.[0];
  const sourceText = viLd?.description || viLd?.descriptionText || '';

  if (!sourceText) return Promise.resolve(null);

  const p = _generate(poi.id, sourceText, targetLang)
    .then(async ({ url, entry }) => {
      if (url && entry) {
        // Fire-and-forget save to DB (non-blocking)
        _saveAudioToDB(poi, entry);
      }
      return url;
    })
    .finally(() => inFlight.delete(ck));

  inFlight.set(ck, p);
  return p;
}

/** Pre-warm cache in background (buffer zone) */
export function prefetchAudioForPoi(poi: PoiDto, targetLang: string): void {
  const ck = `${poi.id}:${targetLang}`;
  if (memCache.has(ck) || inFlight.has(ck)) return;
  generateAudioForPoi(poi, targetLang).catch(() => {});
}

/** Check if audio is already cached (sync) */
export function getCachedAudio(poiId: string, lang: string): string | undefined {
  return memCache.get(`${poiId}:${lang}`);
}

/** Check if generation is currently in-flight */
export function isGenerating(poiId: string, lang: string): boolean {
  return inFlight.has(`${poiId}:${lang}`);
}