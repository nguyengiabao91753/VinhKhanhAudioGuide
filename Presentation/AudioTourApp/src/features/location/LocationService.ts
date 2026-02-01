export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

type LocationCallback = (loc: Location) => void;
type ErrorCallback = (err: LocationError) => void;

export class LocationService {
  private static instance: LocationService | null = null;
  private watcherId: number | null = null;
  private subscribers: LocationCallback[] = [];
  private errorSubscribers: ErrorCallback[] = [];

  private constructor(){}

  static getInstance() {
    if(!this.instance) this.instance = new LocationService();
    return this.instance;
  }

  public start() {
    if (!('geolocation' in navigator)) {
      this.notifyError({ code: 0, message: 'Geolocation not supported' });
      return;
    }
    if (this.watcherId != null) return;

    this.watcherId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: Location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        };
        this.notifySubscribers(loc);
      },
      (err) => {
        this.notifyError({ code: err.code, message: err.message });
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
  }

  public stop() {
    if (this.watcherId != null) {
      navigator.geolocation.clearWatch(this.watcherId);
      this.watcherId = null;
    }
  }

  subscribe(cb: LocationCallback) {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter(x => x !== cb); };
  }
  subscribeError(cb: ErrorCallback){
    this.errorSubscribers.push(cb);
    return () => { this.errorSubscribers = this.errorSubscribers.filter(x=>x!==cb); };
  }

  private notifySubscribers(loc: Location){
    this.subscribers.forEach(cb => cb(loc));
  }
  private notifyError(err: LocationError){
    this.errorSubscribers.forEach(cb => cb(err));
  }
}
