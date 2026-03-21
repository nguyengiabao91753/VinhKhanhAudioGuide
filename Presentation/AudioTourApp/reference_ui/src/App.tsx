/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import MapView from './components/MapView';
import BottomPanel from './components/BottomPanel';
import MenuOverlay from './components/MenuOverlay';
import { calculateDistance, generateMockPOIs, generateMockTours } from './utils/geo';
import { playNarration, stopNarration } from './engines/NarrationEngine';
import { POI, Tour } from './types';
import { Menu } from 'lucide-react';

export default function App() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [playingPoi, setPlayingPoi] = useState<POI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // New State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('autonarration_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tours' | 'favorites' | 'offline'>('tours');
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasDownloadedData, setHasDownloadedData] = useState(() => {
    return !!localStorage.getItem('autonarration_offline_pois');
  });

  const watchIdRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save favorites
  useEffect(() => {
    localStorage.setItem('autonarration_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (poiId: string) => {
    setFavorites(prev => 
      prev.includes(poiId) ? prev.filter(id => id !== poiId) : [...prev, poiId]
    );
  };

  // Load offline data if needed
  useEffect(() => {
    if (isOffline && hasDownloadedData) {
      const savedPois = localStorage.getItem('autonarration_offline_pois');
      if (savedPois) {
        setPois(JSON.parse(savedPois));
      }
    }
  }, [isOffline, hasDownloadedData]);

  // 1. Location Engine
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (isSimulating) return; // Ignore real GPS if simulating
        const newLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLoc);
        
        // Generate POIs on first fix if empty and not offline
        if (pois.length === 0 && !isOffline) {
          const newPois = generateMockPOIs(newLoc.lat, newLoc.lng);
          setPois(newPois);
          setTours(generateMockTours());
        }
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
  }, [isSimulating, pois.length, isOffline]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    stopNarration();
    setPlayingPoi(null);
  }, []);

  // 2. Geofence Engine
  useEffect(() => {
    if (!location || !isTracking || playingPoi) return;

    const RADIUS_METERS = 30; // 30m radius for easier testing

    // Filter POIs that are within range and unplayed
    // If a tour is selected, only consider POIs in that tour
    const eligiblePois = pois.filter(poi => {
      if (poi.played) return false;
      if (selectedTour && !selectedTour.poiIds.includes(poi.id)) return false;
      return calculateDistance(location.lat, location.lng, poi.lat, poi.lng) <= RADIUS_METERS;
    });

    if (eligiblePois.length > 0) {
      // Sort by favorites first
      eligiblePois.sort((a, b) => {
        const aFav = favorites.includes(a.id) ? 1 : 0;
        const bFav = favorites.includes(b.id) ? 1 : 0;
        return bFav - aFav; // Higher (1) comes first
      });

      const nearbyPoi = eligiblePois[0];

      // 3. Narration Engine
      setPlayingPoi(nearbyPoi);
      playNarration(nearbyPoi.description[language], language, () => {
        // On end
        setPlayingPoi(null);
        setPois((prev) => prev.map((p) => (p.id === nearbyPoi.id ? { ...p, played: true } : p)));
      });
    }
  }, [location, isTracking, pois, playingPoi, language, favorites, selectedTour]);

  // Simulation logic
  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      // Resume real tracking
      if (isTracking) {
        stopTracking();
        startTracking();
      }
    } else {
      setIsSimulating(true);
      if (location && pois.length > 0) {
        // Move towards the first unplayed POI (respecting tour if selected)
        let currentLoc = { ...location };
        simulationIntervalRef.current = setInterval(() => {
          setPois(currentPois => {
            let target = currentPois.find(p => !p.played && (!selectedTour || selectedTour.poiIds.includes(p.id)));
            // If no target in tour, just find any unplayed
            if (!target) target = currentPois.find(p => !p.played);

            if (target) {
              // Move 1 meter towards target
              const dx = target.lng - currentLoc.lng;
              const dy = target.lat - currentLoc.lat;
              const dist = Math.sqrt(dx*dx + dy*dy);
              const step = 0.00001; // approx 1 meter
              if (dist > step) {
                currentLoc = {
                  lat: currentLoc.lat + (dy/dist)*step,
                  lng: currentLoc.lng + (dx/dist)*step
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

  // Offline Management
  const handleDownloadData = () => {
    if (pois.length > 0) {
      localStorage.setItem('autonarration_offline_pois', JSON.stringify(pois));
      setHasDownloadedData(true);
    }
  };

  const handleClearData = () => {
    localStorage.removeItem('autonarration_offline_pois');
    setHasDownloadedData(false);
    setIsOffline(false);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      stopNarration();
    };
  }, []);

  const displayedPois = selectedTour ? pois.filter(p => selectedTour.poiIds.includes(p.id)) : pois;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
      {/* Map View */}
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
        
        {/* Top Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg pointer-events-auto text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-800">
                {isTracking ? (language === 'vi' ? 'GPS Đang bật' : 'GPS Active') : (language === 'vi' ? 'GPS Đã dừng' : 'GPS Paused')}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <button 
              onClick={() => setLanguage(l => l === 'vi' ? 'en' : 'vi')}
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

      {/* Error Toast */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      {/* Bottom Panel */}
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
