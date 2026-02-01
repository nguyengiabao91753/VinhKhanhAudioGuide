import React, { useEffect, useMemo, useState } from 'react';
import { MapView } from '../features/map/MapView';
import PoiInfoPanel from '../components/PoiInfoPanel';
import LanguageSelector from '../components/LanguageSelector';
import { useLocation } from '../features/location/useLocation';
import { LocationService } from '../features/location/LocationService';
import { GeofenceService } from '../features/geofence/GeofenceService';
import { NarrationService } from '../features/narration/NarrationService';
import { fetchPois } from '../api/poiApi';
import type { PoiDto } from '../entities/PoiDto';
import '../styles/global.css';

export default function HomePage() {
  const [pois, setPois] = useState<PoiDto[]>([]);
  const [activePoi, setActivePoi] = useState<PoiDto | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('vi');

  const location = useLocation();

  useEffect(()=>{
    fetchPois().then(setPois).catch(() => {});
  },[]);

  useEffect(()=>{
    const geofence = GeofenceService.getInstance();
    geofence.setPois(pois);
    const unsub = geofence.subscribe(({ activePoi: a })=> {
      if (a) {
        setActivePoi(a);
        const narration = NarrationService.getInstance();
        narration.playPoi(a, false);
      }
    });
    return () => unsub();
  },[pois]);

  // Marker click
  const handleMarkerClick = (poi: PoiDto) => {
    setActivePoi(poi);
    NarrationService.getInstance().playPoi(poi, true).catch(()=>{});
  };

  // Pass language change to narration
  useEffect(()=>{
    const ns = NarrationService.getInstance();
    ns.setLanguage(currentLanguage);
  },[currentLanguage]);

  return (
    <div>
      <header className="app-header">
        <h1 style={{margin:0}}>Vinh Khanh Audio Tour</h1>
        <LanguageSelector value={currentLanguage} onChange={setCurrentLanguage} />
      </header>

      <main className="main">
        <MapView
          pois={pois}
          userLocation={location}
          activePoi={activePoi}
          onMarkerClick={handleMarkerClick}
          currentLanguage={currentLanguage}
        />

        <div style={{height:16}} />

        <div style={{padding:'0 12px'}}>
          <div className="bottom-panel">
            <PoiInfoPanel
              poi={activePoi}
              distance={activePoi && location ? GeofenceService.getInstance().distanceBetween(location.latitude, location.longitude, activePoi.position.lat, activePoi.position.lng) : null}
              isPlaying={NarrationService.getInstance().isPlaying()}
              isPaused={NarrationService.getInstance().isPaused()}
              currentLanguage={currentLanguage}
              onPlay={() => activePoi && NarrationService.getInstance().playPoi(activePoi, false)}
              onPause={() => NarrationService.getInstance().pause()}
              onResume={() => NarrationService.getInstance().resume()}
              onCollapse={() => {}}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
