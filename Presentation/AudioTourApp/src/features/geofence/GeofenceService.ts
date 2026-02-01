import type { PoiDto } from '../../entities/PoiDto';
import type { Location } from '../location/LocationService';

export interface GeofenceEvent {
  activePoi: PoiDto | null;
  previousPoi: PoiDto | null;
  distance: number;
}
type GeofenceCallback = (event: GeofenceEvent) => void;

export class GeofenceService {
  private static instance: GeofenceService | null = null;
  private pois: PoiDto[] = [];
  private subscribers: GeofenceCallback[] = [];
  private activePoi: PoiDto | null = null;
  private lastTriggeredAt: Record<string, number> = {}; // cooldown

  static getInstance() {
    if (!this.instance) this.instance = new GeofenceService();
    return this.instance;
  }

  setPois(pois: PoiDto[]) { this.pois = pois || []; }

  subscribe(cb: GeofenceCallback) {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter(x=>x!==cb); }
  }

  // Haversine distance in meters
  distanceBetween(lat1:number, lon1:number, lat2:number, lon2:number){
    const toRad=(v:number)=> v * Math.PI/180;
    const R=6371000;
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
  }

  evaluate(location: Location, radius = 10) {
    if (!this.pois || this.pois.length === 0) {
      this.publish(null, 0);
      return;
    }

    // Find nearest POI within radius
    let nearest: PoiDto | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const p of this.pois) {
      const d = this.distanceBetween(location.latitude, location.longitude, p.position.lat, p.position.lng);
      if (d <= radius && d < nearestDist) {
        nearest = p;
        nearestDist = d;
      }
    }

    // If same as active and in cooldown, ignore
    if (nearest) {
      const now = Date.now();
      const last = this.lastTriggeredAt[nearest.id] || 0;
      if (this.activePoi && this.activePoi.id === nearest.id && now - last < 15000) {
        // ignore repeated triggers within 15s
        this.publish(this.activePoi, nearestDist);
        return;
      }
      this.lastTriggeredAt[nearest.id] = now;
    }

    const previous = this.activePoi;
    this.activePoi = nearest;
    this.publish(this.activePoi, nearestDist === Number.POSITIVE_INFINITY ? 0 : nearestDist);
    // notify subscribers
    this.subscribers.forEach(cb => cb({ activePoi: this.activePoi, previousPoi: previous, distance: nearestDist }));
  }

  private publish(active: PoiDto | null, distance: number) {
    // No-op: this function kept for clarity (subscribers invoked above)
  }
}
