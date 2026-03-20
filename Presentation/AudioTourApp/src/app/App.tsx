import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MapView from '../components/MapView';
import BottomPanel from '../components/BottomPanel';
import NarrationBanner from '../components/NarrationBanner';
import MenuOverlay from '../components/MenuOverlay';
import { Menu, Navigation2, Compass } from 'lucide-react';
import type { POI, Tour } from '../types';
import type { LocalizedData, PoiDto } from '../entities/poi';
import type { TourDto } from '../entities/tour';
import { fetchPois } from '../shared/lib';
import { fetchTours } from '../features/tour';
import { GeofenceEngine } from '../features/geofence/model/GeofenceEngine';
import { AudioTierEngine } from '../features/audio/lib/AudioTierEngine';
import { playNarration, stopNarration } from '../engines/NarrationEngine';
import { SmoothLocationService, type SmoothLocation } from '../features/location/lib/SmoothLocationService';
import type { GeofenceMode } from '../shared/types/geofence';

type SupportedLanguage = 'vi' | 'en';
const FAVORITES_KEY = 'autonarration_favorites';
const OFFLINE_POIS_KEY = 'autonarration_offline_pois';
const API_BASE = import.meta.env.VITE_API_ENDPOINT || 'https://localhost:7047/api';

// ── DTO mappers ───────────────────────────────────────────────────────────
function pickLoc(list: LocalizedData[] | undefined, lang: SupportedLanguage) {
  return list?.find((l) => l.langCode === lang) ?? list?.[0];
}

function mapPoiDto(poi: PoiDto): POI {
  const vi = pickLoc(poi.localizedData, 'vi');
  const en = pickLoc(poi.localizedData, 'en');
  return {
    id: poi.id,
    name: { vi: vi?.name || '', en: en?.name || vi?.name || '' },
    description: { vi: vi?.description || vi?.descriptionText || '', en: en?.description || en?.descriptionText || '' },
    lat: poi.position.lat,
    lng: poi.position.lng,
    played: false,
    imageUrl: poi.banner || poi.thumbnail,
    range: poi.range ?? 30,
    priority: 1000 - (poi.order ?? 0),
  };
}

function mapTourDto(tour: TourDto): Tour {
  const vi = pickLoc(tour.localizedData, 'vi');
  const en = pickLoc(tour.localizedData, 'en');
  return {
    id: tour.id,
    name: { vi: vi?.name || tour.name || '', en: en?.name || tour.name || '' },
    description: { vi: vi?.description || tour.description || '', en: en?.description || tour.description || '' },
    poiIds: tour.poiIds,
    imageUrl: tour.banner || tour.thumbnail,
  };
}

async function logNarration(poiId: string, lang: string, source: string) {
  try {
    await fetch(`${API_BASE}/narration-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poiId, language: lang, source, timestamp: new Date().toISOString() }),
    });
  } catch { /* fire-and-forget */ }
}

// ── App ───────────────────────────────────────────────────────────────────
interface AppProps { initialLanguage?: SupportedLanguage; }

export default function App({ initialLanguage = 'vi' }: AppProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [bearing, setBearing] = useState(0);
  const [headingUp, setHeadingUp] = useState(false);
  const [pois, setPois] = useState<POI[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [playingPoi, setPlayingPoi] = useState<POI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsPollMs, setGpsPollMs] = useState(5000);
  const [geofenceMode, setGeofenceMode] = useState<GeofenceMode>('CRUISE');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tours' | 'favorites' | 'offline'>('tours');
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasDownloadedData, setHasDownloadedData] = useState(() => !!localStorage.getItem(OFFLINE_POIS_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
  });

  const geofenceRef = useRef(new GeofenceEngine({
    cruisePollMs: 5000, approachPollMs: 1000,
    bufferRadiusMeters: 100, coreRadiusMeters: 30,
    enterDebounceMs: 3000, cooldownMs: 5 * 60 * 1000,
  }));
  const audioRef = useRef(AudioTierEngine.getInstance());
  const smoothLocRef = useRef(SmoothLocationService.getInstance());
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const narrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (isOffline && hasDownloadedData) {
      const saved = localStorage.getItem(OFFLINE_POIS_KEY);
      if (saved) try { setPois(JSON.parse(saved)); } catch {}
      return;
    }
    (async () => {
      try {
        const [poiDtos, tourDtos] = await Promise.all([fetchPois(), fetchTours()]);
        if (cancelled) return;
        setPois(poiDtos.map(mapPoiDto));
        setTours(tourDtos.map(mapTourDto));
      } catch (err) { console.error('load failed', err); }
    })();
    return () => { cancelled = true; };
  }, [isOffline, hasDownloadedData]);

  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [favorites]);

  const relevantPois = useMemo(
    () => selectedTour ? pois.filter((p) => selectedTour.poiIds.includes(p.id)) : pois,
    [pois, selectedTour]
  );

  // ── LOCATION: Start immediately on mount (not gated by isTracking) ────
  // FIX: User dot appears as soon as GPS permission was granted in Onboarding.
  // Narration/geofence logic is still gated by isTracking.
  useEffect(() => {
    if (isSimulating) return;
    const loc = smoothLocRef.current;
    const unsub = loc.subscribe((sl: SmoothLocation) => {
      setLocation({ lat: sl.lat, lng: sl.lng });
      if (sl.speed > 0.5) setBearing(sl.bearing);
      setError(null);
    });
    loc.start();
    return () => { unsub(); loc.stop(); };
  }, [isSimulating]); // removed isTracking dependency

  // ── Device orientation → bearing ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const webkit = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      const deg = webkit !== undefined ? webkit : e.alpha !== null ? (360 - e.alpha) % 360 : null;
      if (deg !== null) setBearing(Math.round(deg));
    };
    window.addEventListener('deviceorientationabsolute', handler as EventListener, true);
    window.addEventListener('deviceorientation', handler as EventListener, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler as EventListener, true);
      window.removeEventListener('deviceorientation', handler as EventListener, true);
    };
  }, []);

  // ── Geofence update — gated by isTracking ────────────────────────────
  useEffect(() => {
    if (!location || !isTracking) return;
    const summary = geofenceRef.current.updatePosition(location, relevantPois);
    setGeofenceMode(summary.mode);
    if (summary.suggestedPollMs !== gpsPollMs) setGpsPollMs(summary.suggestedPollMs);

    // Pre-fetch audio for buffer-zone POIs
    const toFetch = geofenceRef.current.getPrefetchPois(relevantPois);
    for (const poi of toFetch) {
      // Build minimal PoiDto to pass to prefetch
      const dto: PoiDto = {
        id: poi.id,
        localizedData: [] as LocalizedData[],
        position: { type: 'Point', lat: poi.lat, lng: poi.lng },
        order: 0, range: poi.range ?? 30, thumbnail: '', banner: '',
      };
      audioRef.current.prefetch(dto);
      geofenceRef.current.markPrefetched(poi.id);
    }
  }, [location, isTracking, relevantPois, gpsPollMs]);

  // ── Narration heartbeat (1s) ──────────────────────────────────────────
  useEffect(() => {
    if (!isTracking || !location) return;
    narrationTimerRef.current = setInterval(() => {
      if (audioRef.current.state.isPlaying) return;

      const readyPois = geofenceRef.current.getReadyPois(relevantPois, {
        selectedTourPoiIds: selectedTour?.poiIds ?? [],
        favorites,
      });
      if (readyPois.length === 0) return;

      const target = readyPois[0];
      setPlayingPoi(target);
      geofenceRef.current.markTriggered(target.id);
      logNarration(target.id, language, 'auto');
      playNarration(target.description[language], language, () => {
        setPlayingPoi(null);
        setPois((prev) => prev.map((p) => p.id === target.id ? { ...p, played: true } : p));
      });
    }, 1000);
    return () => { if (narrationTimerRef.current) clearInterval(narrationTimerRef.current); };
  }, [isTracking, location, relevantPois, selectedTour, favorites, language]);

  // ── Controls ──────────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    setIsTracking(true);
    setError(null);
    geofenceRef.current.reset();
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    stopNarration();
    audioRef.current.stop();
    setPlayingPoi(null);
    setGpsPollMs(5000);
    setGeofenceMode('CRUISE');
    geofenceRef.current.reset();
  }, []);

  const toggleFavorite = useCallback((poiId: string) => {
    setFavorites((prev) => prev.includes(poiId) ? prev.filter((id) => id !== poiId) : [...prev, poiId]);
  }, []);

  useEffect(() => {
    geofenceRef.current.reset();
    setPois((prev) => prev.map((p) => ({ ...p, played: false })));
    setPlayingPoi(null);
    stopNarration();
  }, [selectedTour]);

  // ── Simulation ────────────────────────────────────────────────────────
  const toggleSimulation = useCallback(() => {
    if (isSimulating) {
      setIsSimulating(false);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      smoothLocRef.current.start(); // restart real GPS
      return;
    }
    setIsSimulating(true);
    smoothLocRef.current.stop(); // pause real GPS during sim

    let currentLoc = location ? { ...location } : { lat: 10.7578, lng: 106.7042 };
    simIntervalRef.current = setInterval(() => {
      setPois((currentPois) => {
        const target = currentPois.find((p) =>
          !p.played && (selectedTour ? selectedTour.poiIds.includes(p.id) : true)
        );
        if (target) {
          const dx = target.lng - currentLoc.lng;
          const dy = target.lat - currentLoc.lat;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const step = 0.00008;
          if (dist > step) {
            currentLoc = { lat: currentLoc.lat + (dy / dist) * step, lng: currentLoc.lng + (dx / dist) * step };
            setLocation({ ...currentLoc });
          }
        }
        return currentPois;
      });
    }, 600);
  }, [isSimulating, location, selectedTour]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      stopNarration();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
      <div className="flex-1 relative z-0">
        <MapView
          location={location}
          pois={relevantPois}
          playingPoi={playingPoi}
          language={language}
          bearing={bearing}
          headingUp={headingUp}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          isOffline={isOffline}
        />

        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            <button onClick={() => setIsMenuOpen(true)} className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg pointer-events-auto text-gray-800 hover:bg-gray-50 transition-colors">
              <Menu size={24} />
            </button>

            {/* Location status */}
            <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
                location ? (isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-blue-400 animate-pulse') : 'bg-gray-300'
              }`} />
              <span className="text-sm font-medium text-gray-800">
                {!location
                  ? (language === 'vi' ? 'Đang lấy GPS...' : 'Getting GPS...')
                  : isTracking
                  ? (language === 'vi' ? 'Đang khám phá' : 'Exploring')
                  : (language === 'vi' ? 'GPS sẵn sàng' : 'GPS ready')}
              </span>
            </div>

            {isTracking && (
              <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg pointer-events-auto text-xs text-gray-700">
                <div>Mode: <span className="font-semibold text-emerald-600">{geofenceMode}</span></div>
                <div>Poll: <span className="font-semibold">{gpsPollMs / 1000}s</span></div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            <button onClick={() => setLanguage((l) => l === 'vi' ? 'en' : 'vi')} className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg pointer-events-auto font-medium text-gray-800 hover:bg-gray-50 transition-colors">
              {language === 'vi' ? '🇻🇳 VN' : '🇬🇧 EN'}
            </button>

            <button
              onClick={() => setHeadingUp((h) => !h)}
              className={`bg-white/90 backdrop-blur-md p-2.5 rounded-2xl shadow-lg pointer-events-auto transition-colors ${headingUp ? 'text-blue-600' : 'text-gray-500'}`}
              title={headingUp ? 'North-up' : 'Heading-up'}
            >
              {headingUp ? <Navigation2 size={20} /> : <Compass size={20} />}
            </button>

            {headingUp && (
              <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-1.5">
                <Navigation2 size={14} className="text-blue-500" style={{ transform: `rotate(${bearing}deg)` }} />
                <span className="text-xs font-mono font-semibold text-gray-700">{Math.round(bearing)}°</span>
              </div>
            )}

            {isOffline && (
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-auto">
                {language === 'vi' ? 'NGOẠI TUYẾN' : 'OFFLINE'}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm text-sm">
          {error}
        </div>
      )}

      <NarrationBanner
        playingPoi={playingPoi}
        language={language}
        onStop={() => { setPlayingPoi(null); audioRef.current.stop(); stopNarration(); }}
      />

      <BottomPanel
        isTracking={isTracking}
        onStart={startTracking}
        onStop={stopTracking}
        playingPoi={playingPoi}
        isSimulating={isSimulating}
        onToggleSimulation={toggleSimulation}
        hasLocation={!!location}
        language={language}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      <MenuOverlay
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        tours={tours}
        selectedTour={selectedTour}
        onSelectTour={setSelectedTour}
        pois={pois}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline(!isOffline)}
        hasDownloadedData={hasDownloadedData}
        onDownloadData={() => { if (pois.length > 0) { localStorage.setItem(OFFLINE_POIS_KEY, JSON.stringify(pois)); setHasDownloadedData(true); }}}
        onClearData={() => { localStorage.removeItem(OFFLINE_POIS_KEY); setHasDownloadedData(false); setIsOffline(false); }}
      />
    </div>
  );
}