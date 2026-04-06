import { useMemo } from "react";
import { useActiveUsersSse } from "@/shared/hooks/useActiveUsersSse";

type SessionItem = {
  sessionId: string;
  lang?: string;
  lat?: number | null;
  lng?: number | null;
  onlineSeconds: number;

  device?: string;
  deviceType?: "mobile" | "desktop" | string;
  deviceDisplayName?: string;
  deviceInstanceId?: string;

  currentPoiId?: string | null;
  currentPoiName?: string | null;
  tourId?: string | null;
  tourName?: string | null;
};

export default function ActiveUsersCard() {
  const { data, loading, error } = useActiveUsersSse();

  const sessions = (data.sessions ?? []) as SessionItem[];

  const stats = useMemo(() => {
    const mobile = sessions.filter((s) => s.deviceType === "mobile").length;
    const desktop = sessions.filter((s) => s.deviceType === "desktop").length;
    const gpsCount = sessions.filter(
      (s) => typeof s.lat === "number" && typeof s.lng === "number"
    ).length;

    const languageMap = sessions.reduce<Record<string, number>>((acc, session) => {
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
  }, [sessions]);

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
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#f9fafb",
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Tổng quan nhanh</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <StatBox label="Mobile" value={stats.mobile} />
              <StatBox label="Desktop" value={stats.desktop} />
              <StatBox label="Có GPS" value={stats.gpsCount} />
            </div>

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
            {sessions.map((session) => (
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
                  <strong>Ngôn ngữ:</strong> {session.lang || "-"}
                </div>
                <div>
                  <strong>Thiết bị:</strong>{" "}
                  {session.deviceDisplayName || session.device || "-"}
                </div>
                <div>
                  <strong>Mã thiết bị:</strong>{" "}
                  {session.deviceInstanceId
                    ? shortDeviceInstanceId(session.deviceInstanceId)
                    : "-"}
                </div>
                <div>
                  <strong>Loại:</strong> {session.deviceType || "-"}
                </div>
                <div>
                  <strong>POI:</strong> {session.currentPoiName || session.currentPoiId || "-"}
                </div>
                <div>
                  <strong>Tour:</strong> {session.tourName || session.tourId || "-"}
                </div>
                <div>
                  <strong>Online:</strong> {formatOnlineTime(session.onlineSeconds)}
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div style={{ color: "#6b7280" }}>Hiện chưa có user online</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: "#fff",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>{value}</div>
    </div>
  );
}

function shortSessionId(sessionId: string) {
  if (!sessionId) return "-";
  return sessionId.length <= 16 ? sessionId : `${sessionId.slice(0, 8)}...${sessionId.slice(-6)}`;
}

function shortDeviceInstanceId(deviceInstanceId: string) {
  if (!deviceInstanceId) return "-";
  const clean = deviceInstanceId.replaceAll("-", "");
  return clean.length <= 6 ? clean.toUpperCase() : clean.slice(-6).toUpperCase();
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