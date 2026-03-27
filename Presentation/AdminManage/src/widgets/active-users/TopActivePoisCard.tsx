import { useMemo } from "react";

type SessionItem = {
  sessionId: string;
  lang?: string | null;
  currentPoiId?: string | null;
  tourId?: string | null;
  lat?: number | null;
  lng?: number | null;
  device?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  onlineSeconds: number;
};

type Props = {
  sessions: SessionItem[];
  getPoiLabel: (poiId: string) => string;
};

export default function TopActivePoisCard({ sessions, getPoiLabel }: Props) {
  const recentPois = useMemo(() => {
    const sorted = [...sessions]
      .filter((session) => !!session.currentPoiId)
      .sort((a, b) => {
        const timeA = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        const timeB = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        return timeB - timeA;
      });

    const seen = new Set<string>();

    return sorted
      .filter((session) => {
        const poiId = session.currentPoiId;
        if (!poiId) return false;
        if (seen.has(poiId)) return false;
        seen.add(poiId);
        return true;
      })
      .slice(0, 5)
      .map((session, index) => {
        const poiId = session.currentPoiId as string;

        return {
          rank: index + 1,
          poiId,
          label: getPoiLabel(poiId),
          lastSeen: session.lastSeen,
        };
      });
  }, [sessions, getPoiLabel]);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        minHeight: 280,
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 16 }}>POI gần đây</h3>

      {recentPois.length === 0 ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            color: "#6b7280",
            background: "#f9fafb",
          }}
        >
          Chưa có POI nào gần đây
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {recentPois.map((poi) => (
            <div
              key={poi.poiId}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                background: "#fff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  #{poi.rank}
                </div>

                <div
                  style={{
                    fontWeight: 600,
                    color: "#111827",
                    wordBreak: "break-word",
                    marginBottom: 4,
                  }}
                >
                  {poi.label}
                </div>

                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  {poi.lastSeen
                    ? `Gần nhất: ${new Date(poi.lastSeen).toLocaleTimeString("vi-VN")}`
                    : "Chưa rõ thời gian"}
                </div>
              </div>

              <div
                style={{
                  minWidth: 40,
                  height: 40,
                  borderRadius: 999,
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {poi.rank}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}