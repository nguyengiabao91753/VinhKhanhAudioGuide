/**
 * Location Service
 * Handles GPS permission requests and continuous location tracking
 */

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

type LocationCallback = (location: Location) => void;
type ErrorCallback = (error: LocationError) => void;

export class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private subscribers: LocationCallback[] = [];
  private errorSubscribers: ErrorCallback[] = [];
  private currentLocation: Location | null = null;
  private isTracking = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request GPS permission and start tracking
   */
  async startTracking(): Promise<Location> {
    if (this.isTracking) {
      return this.currentLocation || this.getDefaultLocation();
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error: LocationError = {
          code: 0,
          message: 'Geolocation not supported',
        };
        this.notifyErrorSubscribers(error);
        reject(error);
        return;
      }

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.parsePosition(position);
          this.currentLocation = location;
          this.isTracking = true;
          this.notifySubscribers(location);
          resolve(location);

          // Start continuous tracking
          this.watchId = navigator.geolocation.watchPosition(
            (position) => {
              const updatedLocation = this.parsePosition(position);
              this.currentLocation = updatedLocation;
              this.notifySubscribers(updatedLocation);
            },
            (error) => {
              const locationError: LocationError = {
                code: error.code,
                message: error.message,
              };
              this.notifyErrorSubscribers(locationError);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            }
          );
        },
        (error) => {
          const locationError: LocationError = {
            code: error.code,
            message: error.message,
          };
          this.notifyErrorSubscribers(locationError);
          reject(locationError);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  /**
   * Get current location
   */
  getCurrentLocation(): Location | null {
    return this.currentLocation;
  }

  /**
   * Subscribe to location updates
   */
  subscribe(callback: LocationCallback): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to location errors
   */
  subscribeToErrors(callback: ErrorCallback): () => void {
    this.errorSubscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorSubscribers = this.errorSubscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Parse geolocation position to Location interface
   */
  private parsePosition(position: GeolocationPosition): Location {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  }

  /**
   * Notify all subscribers of location change
   */
  private notifySubscribers(location: Location): void {
    this.subscribers.forEach((callback) => {
      callback(location);
    });
  }

  /**
   * Notify all error subscribers
   */
  private notifyErrorSubscribers(error: LocationError): void {
    this.errorSubscribers.forEach((callback) => {
      callback(error);
    });
  }

  /**
   * Get default location (Hanoi center for demo)
   */
  private getDefaultLocation(): Location {
    return {
      latitude: 21.0285,
      longitude: 105.8542,
      accuracy: 100,
      timestamp: Date.now(),
    };
  }
}
