'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { PoiDto } from '../../dto/PoiDto';
import type { Location } from '../location/LocationService';
import { MapMarker } from './MapMarker';
import styles from './MapView.module.css';

interface MapViewProps {
  pois: PoiDto[];
  userLocation: Location | null;
  activePoi: PoiDto | null;
  onMarkerClick: (poi: PoiDto) => void;
}

/**
 * Map View Component
 * Displays interactive map with user location and POI markers
 * In production, integrate with Google Maps API
 */
export function MapView({ pois, userLocation, activePoi, onMarkerClick }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Convert GPS coordinates to pixel coordinates
  const gpsToPixel = useCallback(
    (lat: number, lng: number, centerLat: number, centerLng: number, zoom: number) => {
      const scale = Math.pow(2, zoom);
      const x = ((lng - centerLng) * scale + 512) / 2;
      const y = ((centerLat - lat) * scale + 512) / 2;
      return { x, y };
    },
    []
  );

  // Draw canvas-based map background
  const drawMap = useCallback(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas || !userLocation) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#e0f2fe');
    gradient.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  }, [userLocation]);

  useEffect(() => {
    drawMap();
    window.addEventListener('resize', drawMap);
    return () => window.removeEventListener('resize', drawMap);
  }, [drawMap]);

  if (!userLocation) {
    return (
      <div className={styles.mapContainer} ref={mapContainerRef}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  const centerLat = userLocation.latitude;
  const centerLng = userLocation.longitude;
  const zoom = 15;
  const containerWidth = mapContainerRef.current?.offsetWidth || 400;
  const containerHeight = mapContainerRef.current?.offsetHeight || 600;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  return (
    <div className={styles.mapContainer} ref={mapContainerRef}>
      <canvas ref={mapCanvasRef} className={styles.mapCanvas} />

      {/* User Location Marker */}
      <div
        className={styles.userMarker}
        style={{
          left: `${centerX}px`,
          top: `${centerY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className={styles.userMarkerDot} />
        <div className={styles.userMarkerRing} />
      </div>

      {/* POI Markers */}
      {pois.map((poi) => {
        const poiPos = gpsToPixel(poi.position.lat, poi.position.lng, centerLat, centerLng, zoom);
        const relX = centerX + (poiPos.x - centerX) * Math.cos((Math.PI / 4) * 0);
        const relY = centerY + (poiPos.y - centerY) * Math.sin((Math.PI / 4) * 0);

        return (
          <div
            key={poi.id}
            style={{
              position: 'absolute',
              left: `${relX}px`,
              top: `${relY}px`,
            }}
          >
            <MapMarker
              poi={poi}
              isActive={activePoi?.id === poi.id}
              onClick={onMarkerClick}
            />
          </div>
        );
      })}

      {/* Attribution */}
      <div className={styles.attribution}>
        <p className={styles.small}>Audio Tour Map</p>
      </div>
    </div>
  );
}
