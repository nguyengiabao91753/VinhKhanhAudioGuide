import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MapView from '../components/MapView';
import BottomPanel from '../components/BottomPanel';
import MenuOverlay from '../components/MenuOverlay';
import { playNarration, stopNarration } from '../engines/NarrationEngine';
import type { POI, Tour } from '../types';
import { Menu } from 'lucide-react';
import { fetchTours } from '../features/tour';
import { fetchPois } from '../shared/lib';
import type { LocalizedData, PoiDto } from '../entities/poi';
import type { TourDto } from '../entities/tour';
import { GeofenceEngine } from '../features/geofence/model/GeofenceEngine';
import type { GeofenceMode } from '../shared/types/geofence';

type SupportedLanguage = 'vi' | 'en';

const FAVORITES_KEY = 'autonarration_favorites';
const OFFLINE_POIS_KEY = 'autonarration_offline_pois';

function pickLocalized(list: LocalizedData[] | undefined, lang: SupportedLanguage) {
  if (!list || list.length === 0) return undefined;
  return list.find((l) => l.langCode === lang) ?? list[0];
}

function resolveLocalized(
  list: LocalizedData[] | undefined,
  fallback: { name?: string; description?: string }
) {
  const vi = pickLocalized(list, 'vi');
  const en = pickLocalized(list, 'en');

  const name = {
    vi: vi?.name || fallback.name || '',
    en: en?.name || fallback.name || '',
  };

  const description = {
    vi: vi?.description || vi?.descriptionText || fallback.description || name.vi,
    en: en?.description || en?.descriptionText || fallback.description || name.en,
  };

  return { name, description };
}

function mapPoiDto(poi: PoiDto): POI {
  const { name, description } = resolveLocalized(poi.localizedData, {});
  return {
    id: poi.id,
    name,
    description,
    lat: poi.position.lat,
    lng: poi.position.lng,
    played: false,
    imageUrl: poi.banner || poi.thumbnail,
    range: poi.range ?? 30,
    priority: 1000 - (poi.order ?? 0),
  };
}

function mapTourDto(tour: TourDto): Tour {
  const { name, description } = resolveLocalized(tour.localizedData, {
    name: tour.name,
    description: tour.description,
  });

  return {
    id: tour.id,
    name,
    description,
    poiIds: tour.poiIds,
    imageUrl: tour.banner || tour.thumbnail,
  };
}

export default function App() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('vi');
  const [playingPoi, setPlayingPoi] = useState<POI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsPollMs, setGpsPollMs] = useState(5000);
  const [geofenceMode, setGeofenceMode] = useState<GeofenceMode>('CRUISE');

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tours' | 'favorites' | 'offline'>('tours');
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasDownloadedData, setHasDownloadedData] = useState(() => {
    return !!localStorage.getItem(OFFLINE_POIS_KEY);
  });

  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geofenceRef = useRef(
    new GeofenceEngine({
      cruisePollMs: 5000,
      approachPollMs: 1000,
      bufferRadiusMeters: 100,
      coreRadiusMeters: 30,
      enterDebounceMs: 3000,
      cooldownMs: 5 * 60 * 1000,
    })
  );

  const relevantPois = useMemo(() => {
    return selectedTour
      ? pois.filter((p) => selectedTour.poiIds.includes(p.id))
      : pois;
  }, [pois, selectedTour]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (poiId: string) => {
    setFavorites((prev) =>
      prev.includes(poiId) ? prev.filter((id) => id !== poiId) : [...prev, poiId]
    );
  };

  useEffect(() => {
    if (isOffline && hasDownloadedData) {
      const savedPois = localStorage.getItem(OFFLINE_POIS_KEY);
      if (savedPois) {
        setPois(JSON.parse(savedPois));
      }
    }
  }, [isOffline, hasDownloadedData]);

  useEffect(() => {
    let cancelled = false;

    if (isOffline && hasDownloadedData) {
      return () => {
        cancelled = true;
      };
    }

    const loadData = async () => {
      try {
        const [poiDtos, tourDtos] = await Promise.all([fetchPois(), fetchTours()]);
        if (cancelled) return;
        setPois(poiDtos.map(mapPoiDto));
        setTours(tourDtos.map(mapTourDto));
      } catch (err) {
        console.error('Failed to load data', err);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOffline, hasDownloadedData]);

  const pollCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsTracking(false);
      return;
    }



    navigator.geolocation.getCurrentPosition(
  (position) => {
    if (isSimulating) return;

    setLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });

    setError(null);

    console.log('GPS update:', {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
    });
  },



      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, [isSimulating]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    setError(null);
    pollCurrentPosition();
  }, [pollCurrentPosition]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    stopNarration();
    setPlayingPoi(null);
    setGpsPollMs(5000);
    setGeofenceMode('CRUISE');
    geofenceRef.current.reset();
  }, []);

  useEffect(() => {
    if (!isTracking || isSimulating) return;

    pollCurrentPosition();

    const timer = window.setInterval(() => {
      pollCurrentPosition();
    }, gpsPollMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [isTracking, isSimulating, gpsPollMs, pollCurrentPosition]);

  useEffect(() => {
    if (!location || !isTracking) return;

    const summary = geofenceRef.current.updatePosition(location, relevantPois);

    setGeofenceMode(summary.mode);

    if (summary.suggestedPollMs !== gpsPollMs) {
      setGpsPollMs(summary.suggestedPollMs);
    }

    const prefetchPois = geofenceRef.current.getPrefetchPois(relevantPois);

    for (const poi of prefetchPois) {
      geofenceRef.current.markPrefetched(poi.id);
      console.log('[Prefetch Trigger]', poi.id, poi.name);
    }
  }, [location, isTracking, relevantPois, gpsPollMs]);

  useEffect(() => {
    if (!isTracking || !location || playingPoi) return;

    const timer = window.setInterval(() => {
      const readyPois = geofenceRef.current.getReadyPois(
        relevantPois,
        {
          selectedTourPoiIds: selectedTour?.poiIds ?? [],
          favorites,
        }
      );

      if (readyPois.length === 0) return;

      const targetPoi = readyPois[0];

      setPlayingPoi(targetPoi);
      geofenceRef.current.markTriggered(targetPoi.id);

      playNarration(targetPoi.description[language], language, () => {
        setPlayingPoi(null);
        setPois((prev) =>
          prev.map((p) => (p.id === targetPoi.id ? { ...p, played: true } : p))
        );
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isTracking, location, playingPoi, relevantPois, selectedTour, favorites, language]);

  useEffect(() => {
    geofenceRef.current.reset();
    setPois((prev) => prev.map((p) => ({ ...p, played: false })));
    setPlayingPoi(null);
    setGpsPollMs(5000);
    setGeofenceMode('CRUISE');
    stopNarration();
  }, [selectedTour]);

  useEffect(() => {
    geofenceRef.current.reset();
    setGpsPollMs(5000);
    setGeofenceMode('CRUISE');
  }, [isOffline]);

  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false);

      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }

      if (isTracking) {
        pollCurrentPosition();
      }
    } else {
      setIsSimulating(true);

      if (location && relevantPois.length > 0) {
        let currentLoc = { ...location };

        simulationIntervalRef.current = setInterval(() => {
          setPois((currentPois) => {
            const currentRelevantPois = selectedTour
              ? currentPois.filter((p) => selectedTour.poiIds.includes(p.id))
              : currentPois;

            let target = currentRelevantPois.find((p) => !p.played);

            if (!target) {
              target = currentPois.find((p) => !p.played);
            }

            if (target) {
              const dx = target.lng - currentLoc.lng;
              const dy = target.lat - currentLoc.lat;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const step = 0.00005;

              if (dist > step) {
                currentLoc = {
                  lat: currentLoc.lat + (dy / dist) * step,
                  lng: currentLoc.lng + (dx / dist) * step,
                };
                setLocation(currentLoc);
              }
            }

            return currentPois;
          });
        }, 1000);
      }
    }
  };

  const handleDownloadData = () => {
    if (pois.length > 0) {
      localStorage.setItem(OFFLINE_POIS_KEY, JSON.stringify(pois));
      setHasDownloadedData(true);
    }
  };

  const handleClearData = () => {
    localStorage.removeItem(OFFLINE_POIS_KEY);
    setHasDownloadedData(false);
    setIsOffline(false);
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      stopNarration();
    };
  }, []);

  const displayedPois = relevantPois;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
      <div className="flex-1 relative z-0">
        <MapView
          location={location}
          pois={displayedPois}
          playingPoi={playingPoi}
          language={language}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          isOffline={isOffline}
        />

        <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg pointer-events-auto text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Menu size={24} />
            </button>

            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              <span className="font-medium text-gray-800">
                {isTracking
                  ? language === 'vi'
                    ? 'GPS Đang bật'
                    : 'GPS Active'
                  : language === 'vi'
                  ? 'GPS Đã dừng'
                  : 'GPS Paused'}
              </span>
            </div>

            {isTracking && (
              <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg pointer-events-auto text-sm text-gray-700">
                <div>
                  Mode: <span className="font-semibold">{geofenceMode}</span>
                </div>
                <div>
                  Poll: <span className="font-semibold">{gpsPollMs / 1000}s</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            <button
              onClick={() => setLanguage((l) => (l === 'vi' ? 'en' : 'vi'))}
              aria-label="Switch language"
              className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg pointer-events-auto font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              {language === 'vi' ? '🇻🇳 VN' : '🇬🇧 EN'}
            </button>

            {isOffline && (
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-auto">
                {language === 'vi' ? 'NGOẠI TUYẾN' : 'OFFLINE'}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
          {error}
        </div>
      )}

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
        onDownloadData={handleDownloadData}
        onClearData={handleClearData}
      />
    </div>
  );
}