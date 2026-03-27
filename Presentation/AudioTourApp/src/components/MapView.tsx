import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Circle, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { PoiDto, LocalizedData } from '../entities/poi';
import { t } from '../shared/i18n';

// ── Inject styles (once) ──────────────────────────────────────────────────
let stylesInjected = false;
function injectMapStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-ring {
      0%  { transform:translate(-50%,-50%) scale(1);   opacity:.6 }
      100%{ transform:translate(-50%,-50%) scale(2.5); opacity:0  }
    }
    @keyframes poi-pulse { from{transform:scale(1)} to{transform:scale(1.3)} }
    @keyframes ripple-out {
      0%  { transform:translate(-50%,-50%) scale(1);   opacity:.7 }
      100%{ transform:translate(-50%,-50%) scale(3);   opacity:0  }
    }
    .poi-ripple       { position:absolute;top:50%;left:50%;width:22px;height:22px;border-radius:50%;
                        border:2px solid var(--c,#10b981);animation:ripple-out 1.8s ease-out infinite; }
    .poi-ripple.r2    { animation-delay:.6s; }
    .poi-ripple.r3    { animation-delay:1.2s; }

    /* Popup */
    .poi-popup .leaflet-popup-content-wrapper {
      border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,.18); padding:0; overflow:hidden;
    }
    .poi-popup .leaflet-popup-content { margin:0; }
    .poi-popup .leaflet-popup-tip-container { display:none; }

    /* Play button inside popup */
    .poi-play-btn {
      display:flex; align-items:center; justify-content:center; gap:6px;
      width:100%; padding:9px 0; border:none; border-radius:0 0 14px 14px;
      background:#10b981; color:#fff; font-weight:700; font-size:13px;
      cursor:pointer; transition:background .15s;
    }
    .poi-play-btn:hover  { background:#059669; }
    .poi-play-btn:active { background:#047857; transform:scale(.98); }
    .poi-play-btn.playing {
      background:#f97316;
    }
    .poi-play-btn.playing:hover { background:#ea6c0f; }
  `;
  document.head.appendChild(style);
}

// ── Icon builders ─────────────────────────────────────────────────────────

function buildUserIcon(bearing: number): L.DivIcon {
  const r = 50; const cx = 32; const cy = 32; const half = 30;
  const s = ((bearing - half - 90) * Math.PI) / 180;
  const e = ((bearing + half - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
  const html = `
    <div style="position:relative;width:64px;height:64px;">
      <svg width="64" height="64" style="position:absolute;overflow:visible">
        <path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z"
          fill="rgba(59,130,246,0.22)" stroke="rgba(59,130,246,0.6)" stroke-width="1"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:16px;height:16px;border-radius:50%;background:#3B82F6;border:2.5px solid white;
        box-shadow:0 2px 8px rgba(59,130,246,.5);z-index:1"></div>
      <div style="position:absolute;top:50%;left:50%;width:32px;height:32px;border-radius:50%;
        background:rgba(59,130,246,.12);animation:pulse-ring 2s ease-out infinite"></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [64, 64], iconAnchor: [32, 32] });
}

function buildPoiIcon(isActive: boolean, played: boolean): L.DivIcon {
  const accent = isActive ? '#10b981' : played ? '#6b7280' : '#f97316';
  const ripple = isActive ? `
    <div class="poi-ripple"    style="--c:${accent}"></div>
    <div class="poi-ripple r2" style="--c:${accent}"></div>
    <div class="poi-ripple r3" style="--c:${accent}"></div>` : '';
  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
      ${ripple}
      <div style="width:22px;height:22px;border-radius:50%;background:${accent};
        border:2.5px solid white;box-shadow:0 2px 8px ${accent}88;z-index:1;
        ${isActive ? 'animation:poi-pulse 1s ease-in-out infinite alternate;' : ''}"></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
}

// ── Popup content builder ─────────────────────────────────────────────────

function buildPopupHtml(poi: PoiDto, language: string, isPlaying: boolean, isFav: boolean, playedIds: Set<string>): string {
  const playLabel = isPlaying
    ? t(language, 'popup.stop')
    : t(language, 'popup.play');
  const heardLabel = playedIds.has(poi.id)
    ? t(language, 'popup.heard')
    : t(language, 'popup.not_yet');
  const heardBg = playedIds.has(poi.id) ? '#d1fae5' : '#fef3c7';
  const heardClr = playedIds.has(poi.id) ? '#065f46' : '#92400e';
  const desc = (poi.localizedData?.find((l: LocalizedData) => l.langCode === language)?.descriptionText
    || poi.localizedData?.find((l: LocalizedData) => l.langCode === language)?.description
    || poi.localizedData?.[0]?.descriptionText
    || poi.localizedData?.[0]?.description
    || '');
  const shortDesc = desc.length > 90 ? desc.slice(0, 90) + '…' : desc;

  return `
    <div style="font-family:system-ui;width:220px;">
      ${(poi.banner || poi.thumbnail)
      ? `<img src="${poi.banner || poi.thumbnail}" style="width:100%;height:90px;object-fit:cover;display:block"/>`
      : `<div style="width:100%;height:60px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);display:flex;align-items:center;justify-content:center;font-size:28px">📍</div>`
    }
      <div style="padding:10px 12px 8px">
        <p style="font-weight:700;margin:0 0 3px;font-size:14px;color:#111">${(poi.localizedData?.find((l: LocalizedData) => l.langCode === language)?.name || poi.localizedData?.[0]?.name || 'POI')}</p>
        <p style="font-size:11px;color:#6b7280;margin:0 0 8px;line-height:1.45">${shortDesc}</p>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${heardBg};color:${heardClr};font-weight:600">
            ${heardLabel}
          </span>
          <button
            onclick="window.__poiToggleFav('${poi.id}')"
            style="font-size:16px;background:none;border:none;cursor:pointer;padding:0;line-height:1"
          >${isFav ? '❤️' : '🤍'}</button>
        </div>
      </div>
      <button
        class="poi-play-btn ${isPlaying ? 'playing' : ''}"
        onclick="window.__poiPlay('${poi.id}')"
      >
        ${playLabel}
      </button>
    </div>`;
}

// ── Camera controller ─────────────────────────────────────────────────────

function MapController({
  location, bearing, headingUp,
}: {
  location: { lat: number; lng: number } | null;
  bearing: number;
  headingUp: boolean;
}) {
  const map = useMap();
  const prevLoc = useRef<{ lat: number; lng: number } | null>(null);
  const autoFollowPausedUntilRef = useRef(0);

  useEffect(() => {
    const pauseFollow = () => {
      autoFollowPausedUntilRef.current = Date.now() + 20000;
    };
    map.on('dragstart', pauseFollow);
    map.on('zoomstart', pauseFollow);
    return () => {
      map.off('dragstart', pauseFollow);
      map.off('zoomstart', pauseFollow);
    };
  }, [map]);

  useEffect(() => {
    if (!location) return;
    const prev = prevLoc.current;
    prevLoc.current = location;
    const next = L.latLng(location.lat, location.lng);

    if (!prev) {
      map.setView(next, map.getZoom(), { animate: false });
      return;
    }

    const movedMeters = map.distance(L.latLng(prev.lat, prev.lng), next);
    if (movedMeters < 2) return;
    if (Date.now() < autoFollowPausedUntilRef.current) return;

    const distanceToCenter = map.distance(map.getCenter(), next);
    if (distanceToCenter < 10) return;

    map.panTo(next, { animate: true, duration: 0.35, easeLinearity: 0.6 });
  }, [location, map]);

  // ── Bearing rotation via RAF — decoupled from React render cycle ────
  // Stores the latest bearing in a ref so the RAF loop reads current value
  // without needing to recreate the effect on every bearing change.
  const bearingRef = useRef(bearing);
  const headingRef = useRef(headingUp);
  const rafBearRef = useRef<number | null>(null);
  const appliedBearingRef = useRef(0);

  useEffect(() => { bearingRef.current = bearing; }, [bearing]);
  useEffect(() => { headingRef.current = headingUp; }, [headingUp]);

  useEffect(() => {
    const container = map.getContainer();
    const controls = Array.from(container.querySelectorAll<HTMLElement>('.leaflet-control-container'));

    const tick = () => {
      rafBearRef.current = requestAnimationFrame(tick);

      if (!headingRef.current) {
        if (appliedBearingRef.current !== 0) {
          container.style.transition = 'transform 0.25s ease';
          container.style.transform = '';
          controls.forEach((el) => {
            el.style.transition = 'transform 0.25s ease';
            el.style.transform = '';
          });
          appliedBearingRef.current = 0;
        }
        return;
      }

      const targetBearing = ((bearingRef.current % 360) + 360) % 360;
      const currentBearing = appliedBearingRef.current;
      let diff = targetBearing - currentBearing;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      if (Math.abs(diff) < 0.2) return;

      const nextBearing = (currentBearing + diff * 0.16 + 360) % 360;
      appliedBearingRef.current = nextBearing;

      container.style.transition = 'none';
      container.style.transform = `rotate(${-nextBearing}deg)`;
      controls.forEach((el) => {
        el.style.transition = 'none';
        el.style.transform = `rotate(${nextBearing}deg)`;
      });
    };

    rafBearRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafBearRef.current) cancelAnimationFrame(rafBearRef.current);
      container.style.transform = '';
      container.style.transition = '';
      controls.forEach((el) => {
        el.style.transform = '';
        el.style.transition = '';
      });
    };
  }, [map]); // keep rotation loop stable, do not restart on every bearing change

  return null;
}

// ── Markers layer ─────────────────────────────────────────────────────────

function MarkersLayer({
  pois, playedIds, playingPoi, location, bearing, language, favorites,
  onToggleFavorite, onPoiPlay,
}: {
  pois: PoiDto[];
  playedIds: Set<string>;
  playingPoi: PoiDto | null;
  location: { lat: number; lng: number } | null;
  bearing: number;
  language: string;
  favorites: string[];
  onToggleFavorite?: (id: string) => void;
  onPoiPlay: (poi: PoiDto) => void;
}) {
  const map = useMap();
  const userMarkerRef = useRef<L.Marker | null>(null);
  const poiMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const openPopupPoiId = useRef<string | null>(null);
  // Stable refs — let click handlers always read latest values without stale closures
  const onPoiPlayRef = useRef(onPoiPlay);
  const onToggleFavoriteRef = useRef(onToggleFavorite);
  const poisRef = useRef(pois);
  const languageRef = useRef(language);
  const favoritesRef = useRef(favorites);
  const playingPoiRef = useRef(playingPoi);
  const playedIdsRef = useRef(playedIds);
  useEffect(() => { onPoiPlayRef.current = onPoiPlay; }, [onPoiPlay]);
  useEffect(() => { onToggleFavoriteRef.current = onToggleFavorite; }, [onToggleFavorite]);
  useEffect(() => { poisRef.current = pois; }, [pois]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { favoritesRef.current = favorites; }, [favorites]);
  useEffect(() => { playingPoiRef.current = playingPoi; }, [playingPoi]);
  useEffect(() => { playedIdsRef.current = playedIds ?? new Set(); }, [playedIds]);

  // ── User marker — position and cone ──────────────────────────────────
  // Position update: on every location change (smooth GPS / sim)
  useEffect(() => {
    if (!location) return;
    if (!userMarkerRef.current) {
      const icon = buildUserIcon(bearing);
      userMarkerRef.current = L.marker(
        [location.lat, location.lng],
        { icon, zIndexOffset: 1000, interactive: false }
      ).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([location.lat, location.lng]);
    }
  }, [location, map]); // bearing NOT here — avoids marker DOM rebuild on every compass tick

  // Cone SVG update: patch the SVG path directly in DOM — no Leaflet setIcon call
  // This runs at React's bearing update rate (≤10Hz after throttle), not 100Hz raw.
  useEffect(() => {
    if (!userMarkerRef.current) return;
    const el = userMarkerRef.current.getElement();
    if (!el) return;
    const path = el.querySelector('path');
    if (!path) return;

    const r = 50; const cx = 32; const cy = 32; const half = 30;
    const s = ((bearing - half - 90) * Math.PI) / 180;
    const e = ((bearing + half - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
    path.setAttribute('d', `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`);
  }, [bearing]); // only patch SVG, no Leaflet re-create

  // ── POI markers ────────────────────────────────────────────────────────
  useEffect(() => {
    const current = poiMarkersRef.current;
    const activeId = playingPoi?.id ?? null;

    for (const poi of pois) {
      const isActive = poi.id === activeId;
      const icon = buildPoiIcon(isActive, playedIds.has(poi.id));
      const latlng: L.LatLngTuple = [poi.position.lat, poi.position.lng];

      if (current.has(poi.id)) {
        const m = current.get(poi.id)!;
        m.setLatLng(latlng).setIcon(icon);

        // Refresh popup content if it's currently open for this POI
        if (openPopupPoiId.current === poi.id && m.getPopup()?.isOpen()) {
          const isPlaying = poi.id === activeId;
          const isFav = favorites.includes(poi.id);
          m.getPopup()!.setContent(buildPopupHtml(poi, language, isPlaying, isFav, playedIds ?? new Set()));
        }
      } else {
        // Tạo marker
        const m = L.marker(latlng, { icon }).addTo(map);

        // Bind popup LẦN ĐẦU TIÊN (dùng nội dung tạm thời, sẽ update sau)
        const initialHtml = buildPopupHtml(
          poi,
          language,           // ngôn ngữ ban đầu
          false,              // chưa playing
          favorites.includes(poi.id),
          playedIds ?? new Set()
        );

        m.bindPopup(initialHtml, {
          closeButton: true,
          className: 'poi-popup',
          maxWidth: 240,
          offset: [0, -20]
        });

        // Xử lý click: update content mới nhất + mở popup
        m.on('click', () => {
          // Đọc giá trị mới nhất từ ref
          const curLang = languageRef.current;
          const curFavs = favoritesRef.current;
          const curPlaying = playingPoiRef.current;
          const curPlayedIds = playedIdsRef.current;

          openPopupPoiId.current = poi.id;

          const isPlaying = poi.id === (curPlaying?.id ?? null);
          const isFav = curFavs.includes(poi.id);

          // Gán lại các hàm global cho button trong popup
          (window as any).__poiPlay = (id: string) => {
            const target = poisRef.current.find((p) => p.id === id);
            m.closePopup();
            openPopupPoiId.current = null;
            if (target) {
              setTimeout(() => onPoiPlayRef.current(target), 0);
            }
          };

          (window as any).__poiToggleFav = (id: string) => {
            onToggleFavoriteRef.current?.(id);
          };

          // Tạo nội dung popup mới nhất
          const latestHtml = buildPopupHtml(
            poi,
            curLang,
            isPlaying,
            isFav,
            curPlayedIds
          );

          // Update nội dung + mở popup
          m.getPopup()!.setContent(latestHtml);
          m.openPopup();
        });

        // Giữ nguyên xử lý khi popup đóng
        m.on('popupclose', () => {
          if (openPopupPoiId.current === poi.id) openPopupPoiId.current = null;
        });

        current.set(poi.id, m);
      }
    }

    // Remove stale markers
    const ids = new Set(pois.map((p) => p.id));
    for (const [id, m] of current) {
      if (!ids.has(id)) { m.remove(); current.delete(id); }
    }
  }, [pois, playingPoi, map, language, favorites]);

  // Cleanup on unmount
  useEffect(() => () => {
    userMarkerRef.current?.remove();
    poiMarkersRef.current.forEach((m) => m.remove());
  }, []);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────

interface MapViewProps {
  location: { lat: number; lng: number } | null;
  pois: PoiDto[];
  playedIds?: Set<string>;
  playingPoi: PoiDto | null;
  language: string;
  bearing?: number;
  headingUp?: boolean;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  onPoiPlay?: (poi: PoiDto) => void;
  onMapClick?: (lat: number, lng: number) => void;
  pickingWaypoints?: boolean;
  isOffline?: boolean;
}

const VN_CENTER: L.LatLngTuple = [10.7578, 106.7042];

export default function MapView({
  location, pois, playingPoi, language,
  bearing = 0, headingUp = false,
  favorites = [], onToggleFavorite,
  onPoiPlay,
  onMapClick,
  pickingWaypoints = false,
  playedIds,
  isOffline = false,
}: MapViewProps) {
  injectMapStyles();

  const center: L.LatLngTuple = location
    ? [location.lat, location.lng]
    : pois[0] ? [pois[0].position.lat, pois[0].position.lng] : VN_CENTER;

  // Fallback no-op if parent didn't wire up onPoiPlay
  const handlePoiPlay = onPoiPlay ?? (() => { });

  return (
    <div className="w-full h-full relative">
      {isOffline && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[2000] bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          OFFLINE
        </div>
      )}
      <MapContainer
        center={center} zoom={17}
        className="w-full h-full"
        zoomControl={false} attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <MapController location={location} bearing={bearing} headingUp={headingUp} />
        {onMapClick && (
          <MapClickHandler active={pickingWaypoints} onMapClick={onMapClick} />
        )}
        {/* POI range circles */}
        {pois.map(poi => {
          const isActive = playingPoi?.id === poi.id;
          const rangeM = poi.range ?? 30;
          return (
            <Circle
              key={`range-${poi.id}`}
              center={[poi.position.lat, poi.position.lng]}
              radius={rangeM}
              pathOptions={{
                color: isActive ? '#10b981' : (playedIds?.has(poi.id) ?? false) ? '#6b7280' : '#f97316',
                weight: isActive ? 2.5 : 1.5,
                opacity: isActive ? 0.9 : 0.5,
                fillColor: isActive ? '#10b981' : (playedIds?.has(poi.id) ?? false) ? '#6b7280' : '#f97316',
                fillOpacity: isActive ? 0.12 : 0.07,
                dashArray: isActive ? undefined : '5 4',
              }}
            />
          );
        })}

        {/* Buffer zone (100m) — shown only when approaching */}
        {pois.map(poi => (
          <Circle
            key={`buf-${poi.id}`}
            center={[poi.position.lat, poi.position.lng]}
            radius={100}
            pathOptions={{
              color: '#3b82f6', weight: 1,
              opacity: 0.2, fillOpacity: 0.03,
              dashArray: '3 8',
            }}
          />
        ))}

        <MarkersLayer
          pois={pois}
          playedIds={playedIds || new Set()}
          playingPoi={playingPoi}
          location={location}
          bearing={bearing}
          language={language}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onPoiPlay={handlePoiPlay}
        />
      </MapContainer>
    </div>
  );
}

// ── Waypoint click handler (added to MapContainer via child component) ────
// Appended to existing MapView.tsx
export function MapClickHandler({
  active,
  onMapClick,
}: {
  active: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!active) return;
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    map.getContainer().style.cursor = 'crosshair';
    return () => {
      map.off('click', handler);
      map.getContainer().style.cursor = '';
    };
  }, [active, map, onMapClick]);
  return null;
}
