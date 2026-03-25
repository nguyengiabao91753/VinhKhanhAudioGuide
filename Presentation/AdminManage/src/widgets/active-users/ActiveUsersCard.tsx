import { useMemo } from "react";
import { useActiveUsersSse } from "@/shared/hooks/useActiveUsersSse";

export default function ActiveUsersCard() {
  const { data, loading, error } = useActiveUsersSse();

  const stats = useMemo(() => {
    const mobile = data.sessions.filter((s) => s.device === "mobile").length;
    const desktop = data.sessions.filter((s) => s.device === "desktop").length;
    const gpsCount = data.sessions.filter(
      (s) => typeof s.lat === "number" && typeof s.lng === "number"
    ).length;

    const languageMap = data.sessions.reduce<Record<string, number>>((acc, session) => {
      const lang = session.lang || "unknown";
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});

    return {
      mobile,
      desktop,
      gpsCount,
      languageMap,
    };
  }, [data.sessions]);

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
      <h3 style={{ margin: 0, marginBottom: 12 }}>User đang online</h3>

      {loading && <p>Đang tải...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 16,
              color: "#16a34a",
            }}
          >
            {data.total}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <MiniStat label="Mobile" value={stats.mobile} color="#16a34a" />
            <MiniStat label="Desktop" value={stats.desktop} color="#2563eb" />
            <MiniStat label="GPS" value={stats.gpsCount} color="#9333ea" />
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#f9fafb",
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Ngôn ngữ đang dùng</div>

            {Object.keys(stats.languageMap).length === 0 ? (
              <div style={{ color: "#6b7280" }}>Chưa có dữ liệu</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(stats.languageMap).map(([lang, count]) => (
                  <div
                    key={lang}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ textTransform: "uppercase", fontWeight: 500 }}>{lang}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {data.sessions.map((session) => (
              <div
                key={session.sessionId}
                style={{
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: "#f9fafb",
                }}
              >
                <div>
                  <strong>Session:</strong> {shortSessionId(session.sessionId)}
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
                  <strong>Online:</strong> {formatOnlineTime(session.onlineSeconds)}
                </div>
              </div>
            ))}

            {data.sessions.length === 0 && (
              <div style={{ color: "#6b7280" }}>Hiện chưa có user online</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#f9fafb",
      }}
    >
      <div style={{ color: "#6b7280", marginBottom: 6, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function shortSessionId(sessionId: string) {
  if (!sessionId) return "-";
  return sessionId.length <= 16 ? sessionId : `${sessionId.slice(0, 8)}...${sessionId.slice(-6)}`;
}

function formatOnlineTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;

  if (minutes < 60) return `${minutes}m ${remainSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;

  return `${hours}h ${remainMinutes}m`;
}