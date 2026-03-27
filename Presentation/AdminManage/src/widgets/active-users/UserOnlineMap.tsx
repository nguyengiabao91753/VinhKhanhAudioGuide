import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L, {
  type LatLngBoundsExpression,
  type LatLngExpression,
} from "leaflet";
import "leaflet.heat";
import { useActiveUsersSse } from "@/shared/hooks/useActiveUsersSse";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_CENTER: LatLngExpression = [10.762622, 106.660172];

type SessionWithLocation = {
  sessionId: string;
  lang: string;
  currentPoiId: string | null;
  tourId: string | null;
  lat: number;
  lng: number;
  device: string;
  firstSeen: string;
  lastSeen: string;
  onlineSeconds: number;
};

function FitBounds({ sessions }: { sessions: SessionWithLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (sessions.length === 0) return;

    if (sessions.length === 1) {
      map.setView([sessions[0].lat, sessions[0].lng], 16);
      return;
    }

    const bounds: LatLngBoundsExpression = sessions.map((s) => [s.lat, s.lng]);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, sessions]);

  return null;
}

function HeatLayer({ sessions }: { sessions: SessionWithLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (!sessions.length) return;

    const heatPoints: [number, number, number][] = sessions.map((s) => [
      s.lat,
      s.lng,
      1,
    ]);

    const heatLayer = (L as typeof L & {
      heatLayer: (
        points: [number, number, number][],
        options?: {
          radius?: number;
          blur?: number;
          maxZoom?: number;
          minOpacity?: number;
        }
      ) => L.Layer;
    }).heatLayer(heatPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 17,
      minOpacity: 0.35,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, sessions]);

  return null;
}

export default function UserOnlineMap() {
  const { data, loading, error } = useActiveUsersSse();

  const sessionsWithLocation: SessionWithLocation[] = data.sessions.filter(
    (s): s is SessionWithLocation =>
      typeof s.lat === "number" && typeof s.lng === "number"
  );

  const center: LatLngExpression =
    sessionsWithLocation.length > 0
      ? [sessionsWithLocation[0].lat, sessionsWithLocation[0].lng]
      : DEFAULT_CENTER;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        minHeight: 430,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 12 }}>Bản đồ user online</h3>

      <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 14 }}>
        Có tọa độ: {sessionsWithLocation.length}/{data.total} user online
      </p>

      {loading && (
        <div
          style={{
            flex: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#f9fafb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
          }}
        >
          Đang tải bản đồ...
        </div>
      )}

      {error && (
        <div
          style={{
            flex: 1,
            border: "1px solid #fecaca",
            borderRadius: 12,
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "red",
            padding: 16,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            flex: 1,
            minHeight: 340,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <FitBounds sessions={sessionsWithLocation} />
            <HeatLayer sessions={sessionsWithLocation} />

            {sessionsWithLocation.map((session) => (
              <Marker
                key={session.sessionId}
                position={[session.lat, session.lng]}
                icon={markerIcon}
              >
                <Popup>
                  <div>
                    <div>
                      <strong>Session:</strong> {session.sessionId}
                    </div>
                    <div>
                      <strong>Ngôn ngữ:</strong> {session.lang}
                    </div>
                    <div>
                      <strong>Thiết bị:</strong> {session.device}
                    </div>
                    <div>
                      <strong>POI:</strong> {session.currentPoiId ?? "-"}
                    </div>
                    <div>
                      <strong>Tour:</strong> {session.tourId ?? "-"}
                    </div>
                    <div>
                      <strong>Online:</strong> {session.onlineSeconds}s
                    </div>
                    <div>
                      <strong>Lat:</strong> {session.lat}
                    </div>
                    <div>
                      <strong>Lng:</strong> {session.lng}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}