/**
 * SmoothLocationService v3
 *
 * Fixes vs v2:
 * - First fix: accept ANY accuracy (show user dot immediately)
 * - Ongoing: relaxed to accuracy <= 80m (was 25m — too strict for urban VN)
 * - Speed filter only applied after 3+ fixes, not before
 * - getCurrentPosition() called immediately as fast bootstrap
 * - Consistent Date.now() timestamps throughout (no RAF/epoch mismatch)
 * - hasFirstFix guard prevents emitting (0,0)
 */

const DEG_TO_RAD = Math.PI / 180;
const EARTH_M = 6_371_000;

export interface SmoothLocation {
  lat: number;
  lng: number;
  accuracy: number;
  bearing: number;   // 0–360° (N=0, E=90)
  speed: number;     // m/s
  timestamp: number; // Date.now()
  raw: boolean;      // true = GPS fix, false = interpolated frame
}

type Subscriber = (loc: SmoothLocation) => void;

export class SmoothLocationService {
  private static _instance: SmoothLocationService | null = null;

  private watchId: number | null = null;
  private rafId: number | null = null;
  private subscribers: Subscriber[] = [];

  private filteredLat = 0;
  private filteredLng = 0;
  private bearing = 0;
  private speed = 0;
  private accuracy = 999;

  private hasFirstFix = false;
  private fixCount = 0;           // count of accepted fixes

  private prevLat: number | null = null;
  private prevLng: number | null = null;
  private prevEpochMs: number | null = null;

  private lastGpsEpochMs = 0;
  private readonly alpha = 0.35;  // low-pass coefficient
  private started = false;

  private constructor() {}

  static getInstance(): SmoothLocationService {
    if (!this._instance) this._instance = new SmoothLocationService();
    return this._instance;
  }

  start() {
    if (this.started) return;
    this.started = true;

    if (!('geolocation' in navigator)) {
      console.warn('[SmoothLoc] Geolocation not supported');
      return;
    }

    // ── Bootstrap: get first fix immediately (faster than watchPosition) ──
    navigator.geolocation.getCurrentPosition(
      (pos) => this.onGps(pos),
      (err) => console.warn('[SmoothLoc] getCurrentPosition error:', err.message),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );

    // ── Continuous watch ──
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.onGps(pos),
      (err) => console.warn('[SmoothLoc] watchPosition error:', err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15_000 }
    );

    // ── Dead-reckoning RAF loop ──
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      this.deadReckon();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.started = false;
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter((s) => s !== cb); };
  }

  // ── Private ──────────────────────────────────────────────────────────

  private onGps(pos: GeolocationPosition) {
    const { latitude, longitude, accuracy, speed: rawSpeed, heading } = pos.coords;
    const nowEpoch = Date.now();

    // FR-5.1 accuracy filter — RELAXED:
    // • First fix: accept anything (show user dot immediately)
    // • After first fix: accept up to 80m (was 25m — too strict for urban GPS)
    if (this.hasFirstFix && accuracy > 80) {
      console.debug('[SmoothLoc] skipped: accuracy', accuracy.toFixed(0) + 'm > 80m');
      return;
    }

    // Speed estimation
    const estimatedSpeed = this.estimateSpeed(latitude, longitude, nowEpoch);
    const detectedSpeed = (rawSpeed !== null && rawSpeed >= 0) ? rawSpeed : estimatedSpeed;

    // FR-5.1 speed filter — only after 3+ fixes to avoid false negatives at startup
    // Skip if clearly stationary AND accuracy is poor
    if (this.fixCount >= 3 && detectedSpeed < 0.3 && accuracy > 30) {
      console.debug('[SmoothLoc] skipped: stationary+poor accuracy', detectedSpeed.toFixed(2), accuracy.toFixed(0));
      return;
    }

    this.fixCount++;

    // Bearing from device heading or estimated from movement
    if (heading !== null && heading !== undefined && !isNaN(heading)) {
      this.bearing = heading;
    } else {
      const eb = this.estimateBearing(latitude, longitude, nowEpoch);
      if (eb !== null) this.bearing = eb;
    }

    this.speed = detectedSpeed;

    // Low-pass filter on position
    if (!this.hasFirstFix) {
      // First fix: accept raw position exactly
      this.filteredLat = latitude;
      this.filteredLng = longitude;
      this.hasFirstFix = true;
      console.info('[SmoothLoc] First GPS fix:', latitude.toFixed(6), longitude.toFixed(6), 'accuracy:', accuracy.toFixed(0) + 'm');
    } else {
      // Subsequent fixes: smooth
      this.filteredLat += (latitude - this.filteredLat) * this.alpha;
      this.filteredLng += (longitude - this.filteredLng) * this.alpha;
    }

    this.accuracy = accuracy;
    this.lastGpsEpochMs = nowEpoch;
    this.prevLat = latitude;
    this.prevLng = longitude;
    this.prevEpochMs = nowEpoch;

    this.emit(true);
  }

  private deadReckon() {
    if (!this.hasFirstFix) return;

    const nowEpoch = Date.now();
    const sinceLast = nowEpoch - this.lastGpsEpochMs;

    // Only extrapolate between GPS updates (16ms–3s window)
    if (sinceLast < 16 || sinceLast > 3000) return;

    if (this.speed > 0.5) {
      const dt = 0.016; // ~1 frame
      const dist = this.speed * dt;
      const bearRad = this.bearing * DEG_TO_RAD;
      const dlat = (dist / EARTH_M) * (180 / Math.PI);
      const cosLat = Math.cos(this.filteredLat * DEG_TO_RAD);
      const dlng = cosLat > 0 ? dlat / cosLat : 0;
      this.filteredLat += dlat * Math.cos(bearRad);
      this.filteredLng += dlng * Math.sin(bearRad);
    }

    this.emit(false);
  }

  private emit(raw: boolean) {
    if (!this.hasFirstFix) return; // never emit (0,0)
    const loc: SmoothLocation = {
      lat: this.filteredLat,
      lng: this.filteredLng,
      accuracy: this.accuracy,
      bearing: this.bearing,
      speed: this.speed,
      timestamp: Date.now(),
      raw,
    };
    this.subscribers.forEach((cb) => cb(loc));
  }

  private estimateSpeed(lat: number, lng: number, nowEpoch: number): number {
    if (!this.prevLat || !this.prevEpochMs) return 0;
    const dt = (nowEpoch - this.prevEpochMs) / 1000;
    if (dt <= 0) return 0;
    return haversine(this.prevLat, this.prevLng!, lat, lng) / dt;
  }

  private estimateBearing(lat: number, lng: number, nowEpoch: number): number | null {
    if (!this.prevLat || !this.prevEpochMs) return null;
    const dt = (nowEpoch - this.prevEpochMs) / 1000;
    if (dt < 0.5) return null;
    return bearing(this.prevLat, this.prevLng!, lat, lng);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return EARTH_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const y = Math.sin(dLng) * Math.cos(lat2 * DEG_TO_RAD);
  const x =
    Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}