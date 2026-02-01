'use client';

import { useEffect, useState } from 'react';
import { MapView } from '../features/map/MapView';
import { PoiInfoPanel } from '../components/PoiInfoPanel';
import { LanguageSelector } from '../components/LanguageSelector';
import { useLocation } from '../features/location/useLocation';
import { LocationService } from '../features/location/LocationService';
import { GeofenceService } from '../features/geofence/GeofenceService';
import { NarrationService } from '../features/narration/NarrationService';
import { fetchPois } from '../api/poiApi';
import type { PoiDto } from '../dto/PoiDto';
import styles from './HomePage.module.css';

/**
 * HomePage Component
 * Main application page coordinating all services and UI
 */
export function HomePage() {
  const { location, error: locationError, isLoading } = useLocation();
  const [pois, setPois] = useState<PoiDto[]>([]);
  const [activePoi, setActivePoi] = useState<PoiDto | null>(null);
  const [distanceToActivePoi, setDistanceToActivePoi] = useState<number | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [narrationState, setNarrationState] = useState({
    status: 'idle' as const,
    isPlaying: false,
    isPaused: false,
  });
  const [poisLoading, setPoisLoading] = useState(true);

  // Initialize services and load POIs
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const loadedPois = await fetchPois();
        setPois(loadedPois);

        // Initialize services
        const geofenceService = GeofenceService.getInstance();
        geofenceService.initialize(loadedPois);

        const narrationService = NarrationService.getInstance();
        narrationService.setLanguage(currentLanguage);

        setPoisLoading(false);
      } catch (err) {
        console.error('Failed to load POIs:', err);
        setPoisLoading(false);
      }
    };

    initializeApp();
  }, [currentLanguage]);

  // Subscribe to geofence changes
  useEffect(() => {
    if (!location || pois.length === 0) return;

    const geofenceService = GeofenceService.getInstance();

    const unsubscribe = geofenceService.subscribe((event) => {
      setActivePoi(event.activePoi);
      setDistanceToActivePoi(event.distance);

      // Auto-play narration when entering POI
      if (event.activePoi && !narrationState.isPlaying) {
        const narrationService = NarrationService.getInstance();
        narrationService.playPoi(event.activePoi, true).catch((err) => {
          console.error('Failed to play narration:', err);
        });
      }
    });

    // Check geofence
    geofenceService.checkGeofence(location);

    return unsubscribe;
  }, [location, pois, narrationState.isPlaying]);

  // Subscribe to narration state changes
  useEffect(() => {
    const narrationService = NarrationService.getInstance();

    const unsubscribe = narrationService.subscribe((state) => {
      setNarrationState({
        status: state.status,
        isPlaying: state.status === 'playing',
        isPaused: state.status === 'paused',
      });
    });

    return unsubscribe;
  }, []);

  // Handle language change
  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);

    const narrationService = NarrationService.getInstance();
    narrationService.setLanguage(langCode);

    // If there's active POI, replay with new language
    if (activePoi && !narrationState.isPlaying) {
      narrationService.playPoi(activePoi, false).catch((err) => {
        console.error('Failed to play narration:', err);
      });
    }
  };

  // Handle POI marker click
  const handleMarkerClick = (poi: PoiDto) => {
    setActivePoi(poi);

    const narrationService = NarrationService.getInstance();
    narrationService.playPoi(poi, true).catch((err) => {
      console.error('Failed to play narration:', err);
    });
  };

  // Handle play
  const handlePlay = () => {
    if (activePoi) {
      const narrationService = NarrationService.getInstance();
      narrationService.playPoi(activePoi, false).catch((err) => {
        console.error('Failed to play narration:', err);
      });
    }
  };

  // Handle pause
  const handlePause = () => {
    const narrationService = NarrationService.getInstance();
    narrationService.pause();
  };

  // Handle resume
  const handleResume = () => {
    const narrationService = NarrationService.getInstance();
    narrationService.resume();
  };

  // Handle collapse
  const handleCollapse = () => {
    const narrationService = NarrationService.getInstance();
    narrationService.stop();
    setActivePoi(null);
  };

  if (isLoading || poisLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.spinner} />
          <h1>Audio Tour</h1>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Audio Tour</h1>
        <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
      </header>

      {/* Location Error */}
      {locationError && (
        <div className={styles.errorBanner}>
          <p>Location permission denied. Using default location for demo.</p>
        </div>
      )}

      {/* Map */}
      <div className={styles.mapWrapper}>
        <MapView
          pois={pois}
          userLocation={location}
          activePoi={activePoi}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* POI Info Panel */}
      <PoiInfoPanel
        poi={activePoi}
        distance={distanceToActivePoi}
        isPlaying={narrationState.isPlaying}
        isPaused={narrationState.isPaused}
        currentLanguage={currentLanguage}
        onPlay={handlePlay}
        onPause={handlePause}
        onResume={handleResume}
        onCollapse={handleCollapse}
      />
    </main>
  );
}
