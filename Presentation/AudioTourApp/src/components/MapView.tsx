import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { POI } from '../types';

// ── Marker helpers ─────────────────────────────────────────────────────────

function buildUserIcon(bearing: number): L.DivIcon {
  const coneAngle = 60;
  const r = 50;
  const halfCone = coneAngle / 2;
  // SVG sector path
  const startRad = ((bearing - halfCone - 90) * Math.PI) / 180;
  const endRad = ((bearing + halfCone - 90) * Math.PI) / 180;
  const cx = 32; const cy = 32;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);

  const html = `
    <div style="position:relative;width:64px;height:64px;">
      <svg width="64" height="64" style="position:absolute;top:0;left:0;overflow:visible">
        <path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z"
          fill="rgba(59,130,246,0.25)" stroke="rgba(59,130,246,0.6)" stroke-width="1"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:16px;height:16px;border-radius:50%;background:#3B82F6;
        border:2.5px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);">
      </div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:32px;height:32px;border-radius:50%;background:rgba(59,130,246,0.12);
        animation:pulse-ring 2s ease-out infinite;">
      </div>
    </div>`;

  return L.divIcon({ html, className: '', iconSize: [64, 64], iconAnchor: [32, 32] });
}

function buildPoiIcon(isActive: boolean, played: boolean): L.DivIcon {
  const accent = isActive ? '#10b981' : played ? '#6b7280' : '#f97316';
  const ripple = isActive
    ? `<div class="poi-ripple" style="--c:${accent}"></div>
       <div class="poi-ripple r2" style="--c:${accent}"></div>
       <div class="poi-ripple r3" style="--c:${accent}"></div>`
    : '';

  const html = `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
      ${ripple}
      <div style="width:22px;height:22px;border-radius:50%;background:${accent};
        border:2.5px solid white;box-shadow:0 2px 8px ${accent}88;z-index:1;
        ${isActive ? 'animation:poi-pulse 1s ease-in-out infinite alternate;' : ''}">
      </div>
    </div>`;

  return L.divIcon({ html, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
}

// ── Camera controller ──────────────────────────────────────────────────────

function MapController({
  location, bearing, headingUp,
}: {
  location: { lat: number; lng: number } | null;
  bearing: number;
  headingUp: boolean;
}) {
  const map = useMap();
  const prevLoc = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!location) return;
    const prev = prevLoc.current;
    prevLoc.current = location;

    if (!prev) {
      map.setView([location.lat, location.lng], map.getZoom());
      return;
    }

    // Pan smoothly
    map.panTo([location.lat, location.lng], { animate: true, duration: 0.3, easeLinearity: 0.5 });
  }, [location, map]);

  useEffect(() => {
    if (!headingUp) return;
    const container = map.getContainer();
    container.style.transition = 'transform 0.2s ease';
    container.style.transform = `rotate(${-bearing}deg)`;

    // Counter-rotate control elements
    const controls = container.querySelectorAll<HTMLElement>('.leaflet-control-container');
    controls.forEach((el) => {
      el.style.transform = `rotate(${bearing}deg)`;
    });
    return () => {
      container.style.transform = '';
      controls.forEach((el) => { el.style.transform = ''; });
    };
  }, [bearing, headingUp, map]);

  return null;
}

// ── Dynamic markers (imperative Leaflet, avoids react-leaflet re-render lag) ──

function MarkersLayer({
  pois, playingPoi, location, bearing, language, favorites, onToggleFavorite,
}: {
  pois: POI[];
  playingPoi: POI | null;
  location: { lat: number; lng: number } | null;
  bearing: number;
  language: 'vi' | 'en';
  favorites: string[];
  onToggleFavorite?: (id: string) => void;
}) {
  const map = useMap();
  const userMarkerRef = useRef<L.Marker | null>(null);
  const poiMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const popupRef = useRef<L.Popup | null>(null);

  // User marker
  useEffect(() => {
    if (!location) return;
    const icon = buildUserIcon(bearing);
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([location.lat, location.lng], { icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([location.lat, location.lng]);
      userMarkerRef.current.setIcon(icon);
    }
  }, [location, bearing, map]);

  // POI markers
  useEffect(() => {
    const current = poiMarkersRef.current;
    const activeId = playingPoi?.id ?? null;

    for (const poi of pois) {
      const isActive = poi.id === activeId;
      const icon = buildPoiIcon(isActive, poi.played);
      const latlng: L.LatLngTuple = [poi.lat, poi.lng];

      if (current.has(poi.id)) {
        const m = current.get(poi.id)!;
        m.setLatLng(latlng);
        m.setIcon(icon);
      } else {
        const m = L.marker(latlng, { icon }).addTo(map);
        m.on('click', () => {
          const fav = favorites.includes(poi.id);
          if (popupRef.current) popupRef.current.remove();
          const popup = L.popup({ closeButton: false, className: 'poi-popup' })
            .setLatLng(latlng)
            .setContent(`
              <div style="font-family:system-ui;min-width:160px;padding:4px">
                <p style="font-weight:600;margin:0 0 4px">${poi.name[language]}</p>
                <p style="font-size:11px;color:#6b7280;margin:0 0 8px;white-space:normal;max-width:180px">${poi.description[language].slice(0, 100)}…</p>
                <div style="display:flex;gap:6px;align-items:center;">
                  <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${poi.played ? '#d1fae5' : '#fef3c7'};color:${poi.played ? '#065f46' : '#92400e'}">
                    ${poi.played ? (language === 'vi' ? '✓ Đã nghe' : '✓ Heard') : (language === 'vi' ? '○ Chưa nghe' : '○ Not heard')}
                  </span>
                  ${onToggleFavorite ? `<button onclick="window.__toggleFav('${poi.id}')" style="font-size:16px;background:none;border:none;cursor:pointer">${fav ? '❤️' : '🤍'}</button>` : ''}
                </div>
              </div>`)
            .openOn(map);
          popupRef.current = popup;
          // Expose toggle callback for popup HTML
          (window as unknown as Record<string, unknown>).__toggleFav = (id: string) => onToggleFavorite?.(id);
        });
        current.set(poi.id, m);
      }
    }

    // Remove stale markers
    const poiIds = new Set(pois.map((p) => p.id));
    for (const [id, m] of current) {
      if (!poiIds.has(id)) { m.remove(); current.delete(id); }
    }
  }, [pois, playingPoi, map, language, favorites, onToggleFavorite]);

  // Cleanup
  useEffect(() => {
    return () => {
      userMarkerRef.current?.remove();
      poiMarkersRef.current.forEach((m) => m.remove());
    };
  }, []);

  return null;
}

// ── Main component ─────────────────────────────────────────────────────────

interface MapViewProps {
  location: { lat: number; lng: number } | null;
  pois: POI[];
  playingPoi: POI | null;
  language: 'vi' | 'en';
  bearing?: number;
  headingUp?: boolean;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  isOffline?: boolean;
}

// Inject styles once
let stylesInjected = false;
function injectMapStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-ring { 0%{transform:translate(-50%,-50%) scale(1);opacity:.6} 100%{transform:translate(-50%,-50%) scale(2.5);opacity:0} }
    @keyframes poi-pulse { from{transform:scale(1)} to{transform:scale(1.3)} }
    @keyframes ripple-out { 0%{transform:translate(-50%,-50%) scale(1);opacity:.7} 100%{transform:translate(-50%,-50%) scale(3);opacity:0} }
    .poi-ripple { position:absolute;top:50%;left:50%;width:22px;height:22px;border-radius:50%;border:2px solid var(--c,#10b981);animation:ripple-out 1.8s ease-out infinite; }
    .poi-ripple.r2 { animation-delay:.6s; }
    .poi-ripple.r3 { animation-delay:1.2s; }
    .poi-popup .leaflet-popup-content-wrapper { border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15); }
    .poi-popup .leaflet-popup-tip-container { display:none; }
  `;
  document.head.appendChild(style);
}

const VN_CENTER: L.LatLngTuple = [10.7578, 106.7042];

export default function MapView({
  location, pois, playingPoi, language, bearing = 0, headingUp = false,
  favorites = [], onToggleFavorite, isOffline = false,
}: MapViewProps) {
  injectMapStyles();

  const center: L.LatLngTuple = location
    ? [location.lat, location.lng]
    : pois[0]
    ? [pois[0].lat, pois[0].lng]
    : VN_CENTER;

  return (
    <div className="w-full h-full relative">
      {isOffline && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[2000] bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          OFFLINE
        </div>
      )}
      <MapContainer
        center={center}
        zoom={17}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <MapController location={location} bearing={bearing} headingUp={headingUp} />
        <MarkersLayer
          pois={pois}
          playingPoi={playingPoi}
          location={location}
          bearing={bearing}
          language={language}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
        />
      </MapContainer>
    </div>
  );
}