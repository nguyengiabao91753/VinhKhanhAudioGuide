import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type MapPickerProps = {
  lat: number;
  lng: number;
  onChange: (value: { lat: number; lng: number }) => void;
  height?: number;
};

const MAPBOX_TOKEN =
  (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string) ||
  (import.meta.env.VITE_MAPBOX_TOKEN as string);

export function MapPicker({
  lat,
  lng,
  onChange,
  height = 360,
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Giữ ref stable cho onChange để tránh re-init map mỗi khi parent re-render
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // ── Effect 1: Khởi tạo map DUY NHẤT 1 LẦN (không phụ thuộc lat/lng/onChange) ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 16,
    });

    const marker = new mapboxgl.Marker({ draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);

    marker.on("dragend", () => {
      const position = marker.getLngLat();
      onChangeRef.current({ lat: position.lat, lng: position.lng });
    });

    map.on("click", (e) => {
      const nextLng = e.lngLat.lng;
      const nextLat = e.lngLat.lat;
      marker.setLngLat([nextLng, nextLat]);
      onChangeRef.current({ lat: nextLat, lng: nextLng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← [] : chỉ chạy 1 lần khi mount, KHÔNG re-init khi lat/lng/onChange thay đổi

  // ── Effect 2: Sync marker + camera khi lat/lng thay đổi từ bên ngoài (VD: user nhập tay) ──
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const current = markerRef.current.getLngLat();
    // Chỉ update nếu thực sự khác (tránh loop khi user kéo marker)
    if (
      Math.abs(current.lat - lat) < 1e-7 &&
      Math.abs(current.lng - lng) < 1e-7
    )
      return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.easeTo({
      center: [lng, lat],
      duration: 500,
    });
  }, [lat, lng]);

  if (!MAPBOX_TOKEN) {
    return <div className="app-card">Missing VITE_MAPBOX_ACCESS_TOKEN</div>;
  }

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height,
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
      }}
    />
  );
}
