import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { PoiDto } from "../../entities/PoiDto";
import type { Location } from "../location/LocationService";
import styles from "./MapView.module.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapViewProps {
  pois: PoiDto[];
  userLocation: Location | null;
  activePoi: PoiDto | null;
  onMarkerClick: (poi: PoiDto) => void;
  currentLanguage: string;
}

export function MapView({
  pois,
  userLocation,
  activePoi,
  onMarkerClick,
  currentLanguage,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // init map
  useEffect(() => {
    if (!mapRef.current) return;

    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: userLocation
        ? [userLocation.longitude, userLocation.latitude]
        : pois[0]
        ? [pois[0].position.lng, pois[0].position.lat]
        : [106.7042, 10.7578],
      zoom: 16,
    });

    return () => {
      mapInstance.current?.remove();
    };
  }, []);

  // update markers
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // user marker
    if (userLocation) {
      let userMarker = markersRef.current.get("user");

      if (!userMarker) {
        userMarker = new mapboxgl.Marker({ color: "#3b82f6" })
          .setLngLat([userLocation.longitude, userLocation.latitude])
          .addTo(map);

        markersRef.current.set("user", userMarker);
      } else {
        userMarker.setLngLat([userLocation.longitude, userLocation.latitude]);
      }
    }

    // poi markers
   pois.forEach(poi => {
  const el = document.createElement("div");
  el.className = "poi-marker";

  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.background = activePoi?.id === poi.id ? "red" : "orange";

  el.addEventListener("click", (e) => {
    e.stopPropagation(); // QUAN TRỌNG
    onMarkerClick(poi);
  });

  const marker = new mapboxgl.Marker(el)
    .setLngLat([poi.position.lng, poi.position.lat])
    .addTo(map);

  markersRef.current.set(poi.id, marker);
});

  }, [pois, userLocation, activePoi, currentLanguage]);

  return <div ref={mapRef} className={styles.mapContainer} />;
}
