// features/map/ui/MapView.tsx — used by TourActivePage
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { PoiDto } from '../../../entities/poi';
import type { SmoothLocation } from '../../location/lib/SmoothLocationService';

// ── Icons ─────────────────────────────────────────────────────────────────
function buildUserDivIcon(bearing: number): L.DivIcon {
  const r = 44; const cx = 36; const cy = 36; const half = 35;
  const s = ((bearing - half - 90) * Math.PI) / 180;
  const e = ((bearing + half - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
  const html = `
    <div style="position:relative;width:72px;height:72px">
      <svg width="72" height="72" style="position:absolute;overflow:visible">
        <path d="M${cx} ${cy}L${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}Z"
          fill="rgba(59,130,246,.22)" stroke="rgba(59,130,246,.55)" stroke-width="1"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:18px;height:18px;border-radius:50%;background:#3B82F6;border:3px solid #fff;
        box-shadow:0 2px 10px rgba(59,130,246,.5)"></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [72, 72], iconAnchor: [36, 36] });
}

function buildPoiDivIcon(isActive: boolean): L.DivIcon {
  const c = isActive ? '#10b981' : '#f97316';
  const ripple = isActive ? `
    <div style="position:absolute;top:50%;left:50%;width:24px;height:24px;border-radius:50%;border:2px solid ${c};transform:translate(-50%,-50%);animation:rpl 1.8s ease-out infinite"></div>
    <div style="position:absolute;top:50%;left:50%;width:24px;height:24px;border-radius:50%;border:2px solid ${c};transform:translate(-50%,-50%);animation:rpl 1.8s ease-out .6s infinite"></div>` : '';
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:36px">${ripple}
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:18px;height:18px;border-radius:50%;background:${c};border:2.5px solid #fff;
        box-shadow:0 2px 8px ${c}88;z-index:1"></div></div>`,
    className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  });
}

// ── Imperative markers layer ──────────────────────────────────────────────
function MarkersLayer({
  pois, activePoi, userLocation, bearing, language, onMarkerClick,
}: {
  pois: PoiDto[]; activePoi: PoiDto | null;
  userLocation: SmoothLocation | null; bearing: number;
  language: string; onMarkerClick: (p: PoiDto) => void;
}) {
  const map = useMap();
  const userRef = useRef<L.Marker | null>(null);
  const poiRefs = useRef<Map<string, L.Marker>>(new Map());
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
    if (!userLocation) return;
    const icon = buildUserDivIcon(bearing);
    const ll: L.LatLngTuple = [userLocation.lat, userLocation.lng];
    if (!userRef.current) {
      userRef.current = L.marker(ll, { icon, zIndexOffset: 999 }).addTo(map);
    } else {
      userRef.current.setLatLng(ll).setIcon(icon);
    }

    if (Date.now() < autoFollowPausedUntilRef.current) return;
    const distanceToCenter = map.distance(map.getCenter(), L.latLng(ll[0], ll[1]));
    if (distanceToCenter < 10) return;

    map.panTo(ll, { animate: true, duration: 0.35, easeLinearity: 0.6 });
  }, [userLocation, bearing, map]);

  useEffect(() => {
    const active = activePoi?.id;
    for (const poi of pois) {
      const isActive = poi.id === active;
      const icon = buildPoiDivIcon(isActive);
      const ll: L.LatLngTuple = [poi.position.lat, poi.position.lng];
      if (poiRefs.current.has(poi.id)) {
        poiRefs.current.get(poi.id)!.setIcon(icon);
      } else {
        const m = L.marker(ll, { icon }).addTo(map);
        m.on('click', () => onMarkerClick(poi));
        poiRefs.current.set(poi.id, m);
      }
    }
    // cleanup
    const ids = new Set(pois.map((p) => p.id));
    poiRefs.current.forEach((m, id) => { if (!ids.has(id)) { m.remove(); poiRefs.current.delete(id); } });
  }, [pois, activePoi, map, onMarkerClick]);

  useEffect(() => () => {
    userRef.current?.remove();
    poiRefs.current.forEach((m) => m.remove());
  }, []);

  return null;
}

// Inject CSS once
let injected = false;
function injectCSS() {
  if (injected) return; injected = true;
  const s = document.createElement('style');
  s.textContent = `@keyframes rpl{0%{transform:translate(-50%,-50%) scale(1);opacity:.7}100%{transform:translate(-50%,-50%) scale(3.5);opacity:0}}`;
  document.head.appendChild(s);
}

// ── Exported component ────────────────────────────────────────────────────
interface MapViewProps {
  pois: PoiDto[]; userLocation: SmoothLocation | null;
  activePoi: PoiDto | null; onMarkerClick: (p: PoiDto) => void;
  currentLanguage: string;
}

export function MapView({ pois, userLocation, activePoi, onMarkerClick, currentLanguage }: MapViewProps) {
  injectCSS();
  const center: L.LatLngTuple = userLocation
    ? [userLocation.lat, userLocation.lng]
    : pois[0] ? [pois[0].position.lat, pois[0].position.lng] : [10.7578, 106.7042];

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MapContainer center={center} zoom={17} className="w-full h-full" zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <MarkersLayer
          pois={pois} activePoi={activePoi} userLocation={userLocation}
          bearing={userLocation?.bearing ?? 0} language={currentLanguage}
          onMarkerClick={onMarkerClick}
        />
      </MapContainer>
    </div>
  );
}
