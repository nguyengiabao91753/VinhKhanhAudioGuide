import { useEffect, useMemo, useState } from "react";

export default function CurrentTimeCard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeText = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
  }, [now]);

  const dateText = useMemo(() => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now);
  }, [now]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          background: "#ecfdf5",
          color: "#16a34a",
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#ff4500",
            display: "inline-block",
            boxShadow: "0 0 0 4px rgba(34,197,94,0.14)",
          }}
        />
        LIVE
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1,
          color: "#0f172a",
          letterSpacing: "-0.03em",
          whiteSpace: "nowrap",
        }}
      >
        {timeText}
      </div>

      <div
        style={{
          width: 1,
          height: 28,
          background: "#e5e7eb",
        }}
      />

      <div style={{ display: "grid", gap: 2 }}>
        <div
          style={{
            color: "#0f172a",
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {dateText}
        </div>
        <div
          style={{
            color: "#64748b",
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
        >
          GMT+7 • Realtime
        </div>
      </div>
    </div>
  );
}