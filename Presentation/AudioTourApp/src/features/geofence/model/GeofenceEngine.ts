import type {
  GeofenceConfig,
  GeofenceMode,
  GeofencePoiState,
  GeofenceUpdateSummary,
} from '../../../shared/types/geofence';
import type { PoiDto } from '../../../entities/poi';
import { calculateDistance } from '../../../utils/geo';

const DEFAULT_CONFIG: GeofenceConfig = {
  cruisePollMs: 5000,
  approachPollMs: 1000,
  bufferRadiusMeters: 100,
  coreRadiusMeters: 30,
  coreExitMultiplier: 1.15,
  enterDebounceMs: 3000,
  cooldownMs: 5 * 60 * 1000,
};

export class GeofenceEngine {
  private config: GeofenceConfig;
  private states: Record<string, GeofencePoiState> = {};

  constructor(config?: Partial<GeofenceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private ensureState(poiId: string): GeofencePoiState {
    if (!this.states[poiId]) {
      this.states[poiId] = {
        poiId,
        isInBuffer: false,
        isInCore: false,
        pendingEnterAt: null,
        confirmedEnterAt: null,
        lastExitAt: null,
        lastTriggeredAt: null,
        cooldownUntil: null,
        lastPrefetchAt: null,
        currentDistance: null,
      };
    }
    return this.states[poiId];
  }

  public updatePosition(
    location: { lat: number; lng: number },
    pois: PoiDto[],
    now: number = Date.now()
  ): GeofenceUpdateSummary {
    let nearestDistance: number | null = null;

    for (const poi of pois) {
      const state = this.ensureState(poi.id);
      const coreRadius = poi.range ?? this.config.coreRadiusMeters;
      const coreExitRadius = coreRadius * this.config.coreExitMultiplier;

      // PoiDto uses position.lat / position.lng
      const distance = calculateDistance(
        location.lat, location.lng,
        poi.position.lat, poi.position.lng
      );
      state.currentDistance = distance;

      if (nearestDistance == null || distance < nearestDistance) nearestDistance = distance;

      if (!state.isInBuffer && distance <= this.config.bufferRadiusMeters) {
        state.isInBuffer = true;
      } else if (state.isInBuffer && distance > this.config.bufferRadiusMeters) {
        state.isInBuffer = false;
      }

      if (!state.isInCore) {
        if (distance <= coreRadius) {
          state.isInCore = true;
          if (!state.pendingEnterAt) state.pendingEnterAt = now;
        }
      } else {
        if (distance > coreExitRadius) {
          state.isInCore = false;
          state.pendingEnterAt = null;
          state.confirmedEnterAt = null;
          state.lastExitAt = now;
        }
      }
    }

    const mode = this.resolveMode(nearestDistance);
    return {
      mode,
      nearestDistance,
      suggestedPollMs: mode === 'CRUISE' ? this.config.cruisePollMs : this.config.approachPollMs,
    };
  }

  private resolveMode(nearestDistance: number | null): GeofenceMode {
    if (nearestDistance == null) return 'CRUISE';
    if (nearestDistance <= this.config.coreRadiusMeters) return 'CORE';
    if (nearestDistance <= this.config.bufferRadiusMeters) return 'APPROACH';
    return 'CRUISE';
  }

  /**
   * Returns POIs in the buffer zone that haven't been prefetched yet.
   * playedIds: set of POI IDs already played this session.
   */
  public getPrefetchPois(pois: PoiDto[], playedIds: Set<string>, now = Date.now()): PoiDto[] {
    return pois.filter((poi) => {
      if (playedIds.has(poi.id)) return false;
      const state = this.ensureState(poi.id);
      if (!state.isInBuffer) return false;
      if (state.isInCore) return false;
      return !(state.lastPrefetchAt != null && now - state.lastPrefetchAt < 60_000);
    });
  }

  public markPrefetched(poiId: string, now = Date.now()) {
    this.ensureState(poiId).lastPrefetchAt = now;
  }

  /**
   * Returns POIs ready to trigger narration.
   * playedIds: set of POI IDs already played this session.
   */
  public getReadyPois(
    pois: PoiDto[],
    playedIds: Set<string>,
    options?: { selectedTourPoiIds?: string[]; favorites?: string[] },
    now = Date.now()
  ): PoiDto[] {
    const selectedIds = options?.selectedTourPoiIds ?? [];
    const favorites   = options?.favorites ?? [];

    const ready = pois.filter((poi) => {
      if (playedIds.has(poi.id)) return false;
      if (selectedIds.length > 0 && !selectedIds.includes(poi.id)) return false;

      const state = this.ensureState(poi.id);
      if (!state.isInCore) return false;
      if (!state.pendingEnterAt) return false;
      if (now - state.pendingEnterAt < this.config.enterDebounceMs) return false;
      if (state.cooldownUntil != null && now < state.cooldownUntil) return false;

      if (!state.confirmedEnterAt) state.confirmedEnterAt = now;
      return true;
    });

    ready.sort((a, b) => {
      // Priority: higher order number = earlier in list (order 0 = highest priority)
      const aPri = 1000 - (a.order ?? 0);
      const bPri = 1000 - (b.order ?? 0);
      if (bPri !== aPri) return bPri - aPri;

      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;

      const aOrder = selectedIds.length > 0 ? selectedIds.indexOf(a.id) : Number.MAX_SAFE_INTEGER;
      const bOrder = selectedIds.length > 0 ? selectedIds.indexOf(b.id) : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const distA = this.ensureState(a.id).currentDistance ?? Number.MAX_SAFE_INTEGER;
      const distB = this.ensureState(b.id).currentDistance ?? Number.MAX_SAFE_INTEGER;
      return distA - distB;
    });

    return ready;
  }

  public markTriggered(poiId: string, now = Date.now()) {
    const state = this.ensureState(poiId);
    state.lastTriggeredAt = now;
    state.cooldownUntil = now + this.config.cooldownMs;
    state.pendingEnterAt = null;
    state.confirmedEnterAt = now;
  }

  public reset() { this.states = {}; }
  public getStates() { return this.states; }
  public getConfig() { return this.config; }
}