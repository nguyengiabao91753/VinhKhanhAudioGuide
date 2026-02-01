'use client';

import { useEffect, useState } from 'react';
import { LocationService, type Location, type LocationError } from './LocationService';

/**
 * React hook for location tracking
 * Automatically requests permissions and tracks user position
 */
export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const locationService = LocationService.getInstance();

    // Subscribe to location updates
    const unsubscribe = locationService.subscribe((newLocation) => {
      setLocation(newLocation);
      setIsLoading(false);
    });

    // Subscribe to errors
    const unsubscribeError = locationService.subscribeToErrors((locationError) => {
      setError(locationError);
      setIsLoading(false);
    });

    // Start tracking
    locationService.startTracking().catch((err) => {
      setError(err);
      setIsLoading(false);
    });

    // Cleanup
    return () => {
      unsubscribe();
      unsubscribeError();
      locationService.stopTracking();
    };
  }, []);

  return {
    location,
    error,
    isLoading,
  };
}
