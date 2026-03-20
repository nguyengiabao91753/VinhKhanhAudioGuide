const AUDIO_CACHE = 'audio-v1';
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isAudio =
    url.pathname.match(/\.(mp3|ogg|wav|m4a|aac)$/i) ||
    e.request.headers.get('accept')?.includes('audio');
  if (!isAudio) return;

  e.respondWith(
    caches.open(AUDIO_CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      if (cached) return cached;

      const response = await fetch(e.request.clone());
      if (!response.ok) return response;

      await cache.put(e.request, response.clone());
      await evictLRU(cache);
      return response;
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'PREFETCH') {
    const { url } = e.data;
    caches.open(AUDIO_CACHE).then(async (cache) => {
      if (await cache.match(url)) return; // already cached
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          await cache.put(url, resp);
          await evictLRU(cache);
        }
      } catch (_) { /* network may be unavailable */ }
    });
  }
});

async function evictLRU(cache) {
  const keys = await cache.keys();
  let totalBytes = 0;
  const entries = [];

  for (const req of keys) {
    const resp = await cache.match(req);
    if (!resp) continue;
    const blob = await resp.blob();
    entries.push({ req, size: blob.size, date: resp.headers.get('date') || '0' });
    totalBytes += blob.size;
  }

  if (totalBytes <= MAX_BYTES) return;

  entries.sort((a, b) => (a.date < b.date ? -1 : 1)); // oldest first
  for (const entry of entries) {
    if (totalBytes <= MAX_BYTES * 0.8) break; // shrink to 80%
    await cache.delete(entry.req);
    totalBytes -= entry.size;
  }
}