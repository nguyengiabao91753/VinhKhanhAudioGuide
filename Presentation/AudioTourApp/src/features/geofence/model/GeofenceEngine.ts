import type {
  GeofenceConfig,
  GeofenceMode,
  GeofencePoiState,
  GeofenceUpdateSummary,
} from '../../../shared/types/geofence';
import type { POI } from '../../../types';
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
    pois: POI[],
    now: number = Date.now()
  ): GeofenceUpdateSummary {
    let nearestDistance: number | null = null;

    for (const poi of pois) {
      const state = this.ensureState(poi.id);

      const bufferRadius = this.config.bufferRadiusMeters;
      const coreRadius = poi.range ?? this.config.coreRadiusMeters;
      const coreExitRadius = coreRadius * this.config.coreExitMultiplier;

      const distance = calculateDistance(location.lat, location.lng, poi.lat, poi.lng);
      state.currentDistance = distance;

      if (nearestDistance == null || distance < nearestDistance) {
        nearestDistance = distance;
      }

      // Buffer enter / exit
      if (!state.isInBuffer && distance <= bufferRadius) {
        state.isInBuffer = true;
      } else if (state.isInBuffer && distance > bufferRadius) {
        state.isInBuffer = false;
      }

      // Core enter / exit
      if (!state.isInCore) {
        if (distance <= coreRadius) {
          state.isInCore = true;
          if (!state.pendingEnterAt) {
            state.pendingEnterAt = now;
          }
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
      suggestedPollMs:
        mode === 'CRUISE'
          ? this.config.cruisePollMs
          : this.config.approachPollMs,
    };
  }

  private resolveMode(nearestDistance: number | null): GeofenceMode {
    if (nearestDistance == null) return 'CRUISE';
    if (nearestDistance <= this.config.coreRadiusMeters) return 'CORE';
    if (nearestDistance <= this.config.bufferRadiusMeters) return 'APPROACH';
    return 'CRUISE';
  }

  public getPrefetchPois(pois: POI[], now: number = Date.now()): POI[] {
    return pois.filter((poi) => {
      const state = this.ensureState(poi.id);

      if (poi.played) return false;
      if (!state.isInBuffer) return false;
      if (state.isInCore) return false;

      const alreadyPrefetchedRecently =
        state.lastPrefetchAt != null && now - state.lastPrefetchAt < 60 * 1000;

      return !alreadyPrefetchedRecently;
    });
  }

  public markPrefetched(poiId: string, now: number = Date.now()) {
    const state = this.ensureState(poiId);
    state.lastPrefetchAt = now;
  }

  public getReadyPois(
    pois: POI[],
    options?: {
      selectedTourPoiIds?: string[];
      favorites?: string[];
    },
    now: number = Date.now()
  ): POI[] {
    const selectedTourPoiIds = options?.selectedTourPoiIds ?? [];
    const favorites = options?.favorites ?? [];

    const ready = pois.filter((poi) => {
      if (poi.played) return false;

      if (selectedTourPoiIds.length > 0 && !selectedTourPoiIds.includes(poi.id)) {
        return false;
      }

      const state = this.ensureState(poi.id);

      if (!state.isInCore) return false;
      if (!state.pendingEnterAt) return false;

      const debouncePassed = now - state.pendingEnterAt >= this.config.enterDebounceMs;
      if (!debouncePassed) return false;

      const inCooldown = state.cooldownUntil != null && now < state.cooldownUntil;
      if (inCooldown) return false;

      if (!state.confirmedEnterAt) {
        state.confirmedEnterAt = now;
      }

      return true;
    });

    ready.sort((a, b) => {
      const aPriority = a.priority ?? 0;
      const bPriority = b.priority ?? 0;

      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }

      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;

      if (bFav !== aFav) {
        return bFav - aFav;
      }

      const aTourOrder =
        selectedTourPoiIds.length > 0
          ? selectedTourPoiIds.indexOf(a.id)
          : Number.MAX_SAFE_INTEGER;

      const bTourOrder =
        selectedTourPoiIds.length > 0
          ? selectedTourPoiIds.indexOf(b.id)
          : Number.MAX_SAFE_INTEGER;

      if (aTourOrder !== bTourOrder) {
        return aTourOrder - bTourOrder;
      }

      const stateA = this.ensureState(a.id);
      const stateB = this.ensureState(b.id);

      const distA = stateA.currentDistance ?? Number.MAX_SAFE_INTEGER;
      const distB = stateB.currentDistance ?? Number.MAX_SAFE_INTEGER;

      return distA - distB;
    });

    return ready;
  }

  public markTriggered(poiId: string, now: number = Date.now()) {
    const state = this.ensureState(poiId);
    state.lastTriggeredAt = now;
    state.cooldownUntil = now + this.config.cooldownMs;
    state.pendingEnterAt = null;
    state.confirmedEnterAt = now;
  }

  public reset() {
    this.states = {};
  }

  public getStates() {
    return this.states;
  }

  public getConfig() {
    return this.config;
  }
}