'use client';

import { useState } from 'react';
import type { PoiDto } from '../dto/PoiDto';
import styles from './PoiInfoPanel.module.css';

interface PoiInfoPanelProps {
  poi: PoiDto | null;
  distance: number | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentLanguage: string;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onCollapse: () => void;
}

/**
 * POI Info Panel Component
 * Bottom sheet displaying current POI information
 * Collapsible and draggable on mobile
 */
export function PoiInfoPanel({
  poi,
  distance,
  isPlaying,
  isPaused,
  currentLanguage,
  onPlay,
  onPause,
  onResume,
  onCollapse,
}: PoiInfoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!poi) {
    return (
      <div className={styles.panel}>
        <div className={styles.collapsed}>
          <p className={styles.placeholder}>No POI nearby</p>
        </div>
      </div>
    );
  }

  const localizedData = poi.localizedData.find((data) => data.langCode === currentLanguage) ||
    poi.localizedData[0] || {
    name: poi.id,
    description: '',
    descriptionText: '',
    langCode: currentLanguage,
    descriptionAudio: '',
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className={`${styles.panel} ${isExpanded ? styles.expanded : ''}`}>
      {/* Handle Bar */}
      <div
        className={styles.handleBar}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Toggle POI info panel"
      >
        <div className={styles.handle} />
      </div>

      {/* Collapsed View */}
      <div className={styles.collapsed}>
        <div className={styles.poiHeader}>
          <div className={styles.poiInfo}>
            <h3 className={styles.poiName}>{localizedData.name}</h3>
            {distance !== null && (
              <p className={styles.distance}>{formatDistance(distance)}</p>
            )}
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => {
              onCollapse();
              setIsExpanded(false);
            }}
            type="button"
            aria-label="Close POI panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className={styles.expandedContent}>
          {/* Banner Image */}
          <div className={styles.bannerContainer}>
            <img
              src={poi.banner || "/placeholder.svg"}
              alt={localizedData.name}
              className={styles.banner}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.backgroundColor = '#e2e8f0';
              }}
            />
          </div>

          {/* Description */}
          <div className={styles.description}>
            <p className={styles.descriptionText}>{localizedData.descriptionText}</p>
          </div>

          {/* Play Controls */}
          <div className={styles.controls}>
            {!isPlaying ? (
              <button
                className={`${styles.btn} ${styles.playBtn}`}
                onClick={onPlay}
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play Audio
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    className={`${styles.btn} ${styles.playBtn}`}
                    onClick={onResume}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Resume
                  </button>
                ) : (
                  <button
                    className={`${styles.btn} ${styles.pauseBtn}`}
                    onClick={onPause}
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    Pause
                  </button>
                )}
              </>
            )}
          </div>

          {/* POI Info */}
          <div className={styles.poiMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Stop Number</span>
              <span className={styles.metaValue}>{poi.order}</span>
            </div>
            {distance !== null && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Distance</span>
                <span className={styles.metaValue}>{formatDistance(distance)}</span>
              </div>
            )}
            {poi.range && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Detection Range</span>
                <span className={styles.metaValue}>{poi.range}m</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
