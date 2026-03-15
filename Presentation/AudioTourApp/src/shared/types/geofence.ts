export type GeofenceMode = 'CRUISE' | 'APPROACH' | 'CORE';

export type GeofenceConfig = {
  cruisePollMs: number;
  approachPollMs: number;
  bufferRadiusMeters: number;
  coreRadiusMeters: number;
  coreExitMultiplier: number;
  enterDebounceMs: number;
  cooldownMs: number;
};

export type GeofencePoiState = {
  poiId: string;
  isInBuffer: boolean;
  isInCore: boolean;
  pendingEnterAt: number | null;
  confirmedEnterAt: number | null;
  lastExitAt: number | null;
  lastTriggeredAt: number | null;
  cooldownUntil: number | null;
  lastPrefetchAt: number | null;
  currentDistance: number | null;
};

export type GeofenceUpdateSummary = {
  mode: GeofenceMode;
  nearestDistance: number | null;
  suggestedPollMs: number;
};