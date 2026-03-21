import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTourById } from '../features/tour';
import { fetchPois } from '../shared/lib';
import { MapView } from '../features/map/ui/MapView';
import { ItineraryList } from '../widgets/itineraryList';
import { POIDetailModal } from '../widgets/poiDetailModal';
import { LanguageSelector } from '../features/languageSelection';
import { GeofenceEngine } from '../features/geofence/model/GeofenceEngine';
import { AudioTierEngine } from '../features/audio/lib/AudioTierEngine';
import { SmoothLocationService } from '../features/location/lib/SmoothLocationService';
import type { TourDto } from '../entities/tour';
import type { PoiDto } from '../entities/poi';
import type { SmoothLocation } from '../features/location/lib/SmoothLocationService';
import { ArrowLeft } from 'lucide-react';

export default function TourActivePage() {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();

  const [tour, setTour] = useState<TourDto | null>(null);
  const [tourPois, setTourPois] = useState<PoiDto[]>([]);
  const [activePoi, setActivePoi] = useState<PoiDto | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<PoiDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('vi');
  const [userLocation, setUserLocation] = useState<SmoothLocation | null>(null);
  const [bearing, setBearing] = useState(0);

  const geofenceRef = useRef(new GeofenceEngine({
    bufferRadiusMeters: 100, coreRadiusMeters: 30,
    enterDebounceMs: 3000, cooldownMs: 5 * 60 * 1000,
    cruisePollMs: 5000, approachPollMs: 1000,
  }));
  const audioRef = useRef(AudioTierEngine.getInstance());
  const smoothLocRef = useRef(SmoothLocationService.getInstance());
  const narrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load tour data
  useEffect(() => {
    Promise.all([fetchTourById(tourId || ''), fetchPois()]).then(([tourData, allPois]) => {
      if (tourData) {
        setTour(tourData);
        const tPois = tourData.poiIds
          .map((id) => allPois.find((p) => p.id === id))
          .filter((p): p is PoiDto => p !== undefined);
        setTourPois(tPois);
      }
      setLoading(false);
    });
  }, [tourId]);

  // Smooth location
  useEffect(() => {
    const loc = smoothLocRef.current;
    const unsub = loc.subscribe((sl: SmoothLocation) => {
      setUserLocation(sl);
      if (sl.speed > 0.3) setBearing(sl.bearing);
    });
    loc.start();
    return () => { unsub(); loc.stop(); };
  }, []);

  // GeofenceEngine + narration heartbeat
  useEffect(() => {
    if (!userLocation || tourPois.length === 0) return;

    // Build minimal POI list for GeofenceEngine
    const mapped = tourPois.map((p) => ({
      id: p.id, lat: p.position.lat, lng: p.position.lng,
      range: p.range, priority: 0, played: false,
      name: { vi: '', en: '' }, description: { vi: '', en: '' },
    }));

    geofenceRef.current.updatePosition({ lat: userLocation.lat, lng: userLocation.lng }, mapped as never);

    // Pre-fetch
    const toFetch = geofenceRef.current.getPrefetchPois(mapped as never);
    for (const p of toFetch) {
      const poi = tourPois.find((tp) => tp.id === p.id);
      if (poi) audioRef.current.prefetch(poi);
      geofenceRef.current.markPrefetched(p.id);
    }

    return undefined;
  }, [userLocation, tourPois]);

  useEffect(() => {
    narrationTimerRef.current = setInterval(() => {
      if (audioRef.current.state.isPlaying || tourPois.length === 0) return;

      const mapped = tourPois.map((p) => ({
        id: p.id, lat: p.position.lat, lng: p.position.lng,
        range: p.range, priority: 0, played: false,
        name: { vi: '', en: '' }, description: { vi: '', en: '' },
      }));
      const ready = geofenceRef.current.getReadyPois(mapped as never);
      if (ready.length === 0) return;

      const target = tourPois.find((p) => p.id === ready[0].id);
      if (!target) return;

      setActivePoi(target);
      geofenceRef.current.markTriggered(target.id);
      audioRef.current.setLanguage(language);
      audioRef.current.play(target, false);
    }, 1000);
    return () => { if (narrationTimerRef.current) clearInterval(narrationTimerRef.current); };
  }, [tourPois, language]);

  useEffect(() => {
    audioRef.current.setLanguage(language);
  }, [language]);

  const handleMarkerClick = (poi: PoiDto) => {
    setActivePoi(poi);
    setSelectedPoi(poi);
    audioRef.current.setLanguage(language);
    audioRef.current.play(poi, true);
  };

  const handleNext = () => {
    const idx = tourPois.findIndex((p) => p.id === selectedPoi?.id);
    if (idx >= 0 && idx < tourPois.length - 1) setSelectedPoi(tourPois[idx + 1]);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        {language === 'en' ? 'Loading tour...' : 'Đang tải tour...'}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white flex items-center justify-between px-4 py-3 shadow-sm z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/tour/${tourId}`)} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft size={22} />
          </button>
          <div>
            <p className="font-semibold text-sm text-gray-900">{tour?.name || 'Tour'}</p>
            <p className="text-xs text-emerald-600">{tourPois.length} {language === 'vi' ? 'điểm dừng' : 'stops'}</p>
          </div>
        </div>
        <LanguageSelector value={language} onChange={setLanguage} />
      </header>

      {/* Map fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <MapView
          pois={tourPois}
          userLocation={userLocation}
          activePoi={activePoi}
          onMarkerClick={handleMarkerClick}
          currentLanguage={language}
        />
      </div>

      {/* Itinerary bottom sheet (mobile) */}
      <div className="bg-white border-t border-gray-100 max-h-52 overflow-y-auto shrink-0">
        <div className="px-4 py-3">
          <ItineraryList pois={tourPois} currentLanguage={language} onSelectPoi={handleMarkerClick} />
        </div>
      </div>

      <POIDetailModal
        poi={selectedPoi}
        language={language}
        isOpen={!!selectedPoi}
        onClose={() => setSelectedPoi(null)}
        onNext={handleNext}
      />
    </div>
  );
}