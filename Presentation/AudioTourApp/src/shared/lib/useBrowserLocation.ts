import { useEffect, useState } from "react";

type BrowserLocation = {
  lat: number | null;
  lng: number | null;
  error: string | null;
};

export function useBrowserLocation() {
  const [location, setLocation] = useState<BrowserLocation>({
    lat: null,
    lng: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        lat: null,
        lng: null,
        error: "Geolocation không được hỗ trợ",
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
        });
      },
      (err) => {
        setLocation({
          lat: null,
          lng: null,
          error: err.message,
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return location;
}