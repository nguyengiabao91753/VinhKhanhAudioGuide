'use client';

import type { PoiDto } from '../../dto/PoiDto';
import styles from './MapMarker.module.css';

interface MapMarkerProps {
  poi: PoiDto;
  isActive: boolean;
  onClick: (poi: PoiDto) => void;
}

/**
 * Map Marker Component
 * Displays a marker for a POI on the map
 */
export function MapMarker({ poi, isActive, onClick }: MapMarkerProps) {
  return (
    <button
      className={`${styles.marker} ${isActive ? styles.active : ''}`}
      onClick={() => onClick(poi)}
      type="button"
      aria-label={`POI: ${poi.localizedData[0]?.name || poi.id}`}
      title={poi.localizedData[0]?.name}
    >
      <div className={styles.icon}>
        {isActive && <div className={styles.pulse} />}
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" />
        </svg>
      </div>
    </button>
  );
}
