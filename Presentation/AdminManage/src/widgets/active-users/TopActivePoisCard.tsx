import type { ActiveSession } from "@/shared/api/sessionApi";

type TopActivePoisCardProps = {
  sessions: ActiveSession[];
  getPoiLabel?: (poiId: string) => string;
};

export default function TopActivePoisCard({
  sessions,
  getPoiLabel,
}: TopActivePoisCardProps) {
  const poiCountMap = sessions.reduce<Record<string, number>>((acc, session) => {
    if (!session.currentPoiId) return acc;
    acc[session.currentPoiId] = (acc[session.currentPoiId] || 0) + 1;
    return acc;
  }, {});

  const topPois = Object.entries(poiCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 16 }}>Top POI đang được nghe</h3>

      {topPois.length === 0 ? (
        <div style={{ color: "#6b7280" }}>Hiện chưa có POI nào đang phát</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {topPois.map(([poiId, count], index) => (
            <div
              key={poiId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                background: "#f9fafb",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 4,
                  }}
                >
                  #{index + 1}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={getPoiLabel ? getPoiLabel(poiId) : poiId}
                >
                  {getPoiLabel ? getPoiLabel(poiId) : poiId}
                </div>
              </div>

              <div
                style={{
                  minWidth: 44,
                  textAlign: "center",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#dcfce7",
                  color: "#166534",
                  fontWeight: 700,
                }}
              >
                {count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}