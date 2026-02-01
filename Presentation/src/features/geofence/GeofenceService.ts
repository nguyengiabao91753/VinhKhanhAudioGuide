import type { PoiDto } from '../../dto/PoiDto';
import type { Location } from '../location/LocationService';

/**
 * Geofence Service
 * Detects when user enters POI radius and manages active POI state
 */

export interface GeofenceEvent {
  activePoi: PoiDto | null;
  previousPoi: PoiDto | null;
  distance: number;
}

type GeofenceCallback = (event: GeofenceEvent) => void;

export class GeofenceService {
  private static instance: GeofenceService;
  private pois: PoiDto[] = [];
  private activePoi: PoiDto | null = null;
  private previousActivePoi: PoiDto | null = null;
  private subscribers: GeofenceCallback[] = [];
  private debounceTimeout: NodeJS.Timeout | null = null;
  private debounceDelay = 1000; // 1 second debounce to avoid rapid re-triggers

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): GeofenceService {
    if (!GeofenceService.instance) {
      GeofenceService.instance = new GeofenceService();
    }
    return GeofenceService.instance;
  }

  /**
   * Initialize with POI list
   */
  initialize(pois: PoiDto[]): void {
    this.pois = pois.sort((a, b) => a.order - b.order);
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Find nearest POI within range or previously active POI
   * Input: current GPS location + POI list
   * Output: active POI (or null if out of range)
   */
  checkGeofence(location: Location): void {
    if (this.debounceTimeout !== null) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      const nearestPoi = this.findNearestPoi(location);
      
      if (nearestPoi) {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          nearestPoi.position.lat,
          nearestPoi.position.lng
        );

        // Only update if entering a new POI or already inside one
        if (distance <= nearestPoi.range) {
          if (this.activePoi?.id !== nearestPoi.id) {
            this.previousActivePoi = this.activePoi;
            this.activePoi = nearestPoi;
            this.notifySubscribers({
              activePoi: this.activePoi,
              previousPoi: this.previousActivePoi,
              distance,
            });
          }
        } else if (this.activePoi) {
          // User moved out of range
          this.previousActivePoi = this.activePoi;
          this.activePoi = null;
          this.notifySubscribers({
            activePoi: null,
            previousPoi: this.previousActivePoi,
            distance,
          });
        }
      } else if (this.activePoi) {
        // No POI nearby, clear active
        this.previousActivePoi = this.activePoi;
        this.activePoi = null;
        this.notifySubscribers({
          activePoi: null,
          previousPoi: this.previousActivePoi,
          distance: Infinity,
        });
      }

      this.debounceTimeout = null;
    }, this.debounceDelay);
  }

  /**
   * Find nearest POI to user location
   */
  private findNearestPoi(location: Location): PoiDto | null {
    let nearest: PoiDto | null = null;
    let minDistance = Infinity;

    for (const poi of this.pois) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        poi.position.lat,
        poi.position.lng
      );

      if (distance < minDistance && distance <= poi.range + 500) {
        // Look up to range + 500m buffer
        minDistance = distance;
        nearest = poi;
      }
    }

    return nearest;
  }

  /**
   * Get currently active POI
   */
  getActivePoi(): PoiDto | null {
    return this.activePoi;
  }

  /**
   * Subscribe to geofence changes
   */
  subscribe(callback: GeofenceCallback): () => void {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of geofence change
   */
  private notifySubscribers(event: GeofenceEvent): void {
    this.subscribers.forEach((callback) => {
      callback(event);
    });
  }

  /**
   * Get all POIs
   */
  getPois(): PoiDto[] {
    return this.pois;
  }

  /**
   * Calculate distance to a specific POI
   */
  getDistanceToPoi(location: Location, poi: PoiDto): number {
    return this.calculateDistance(
      location.latitude,
      location.longitude,
      poi.position.lat,
      poi.position.lng
    );
  }
}
