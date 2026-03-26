import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
} from "recharts";

type TrendItem = {
  hour: string;
  users: number;
};

type ApiResponse = {
  date: string;
  data: TrendItem[];
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: TrendItem;
  }>;
  label?: string;
};

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#6b7280",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        Khung giờ
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          color: "#16a34a",
          fontWeight: 700,
        }}
      >
        {value} user
      </div>
    </div>
  );
}

export default function OnlineTrendCard() {
  const [data, setData] = useState<TrendItem[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5111";

  const loadTrend = async () => {
    try {
      setError("");

      const res = await fetch(`${API_BASE}/api/admin/analytics/online-trend`);

      if (!res.ok) {
        throw new Error("Không tải được dữ liệu biểu đồ");
      }

      const json: ApiResponse = await res.json();
      setData(json.data || []);
      setDate(json.date || "");
    } catch (err) {
      console.error(err);
      setError("Không tải được dữ liệu biểu đồ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrend();

    const timer = setInterval(() => {
      loadTrend();
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const peakHour = useMemo(() => {
    if (!data.length) return null;
    return data.reduce((max, item) => (item.users > max.users ? item : max), data[0]);
  }, [data]);

  const activeHours = useMemo(() => {
    return data.filter((item) => item.users > 0).length;
  }, [data]);

  const totalUsersInDay = useMemo(() => {
    return data.reduce((sum, item) => sum + item.users, 0);
  }, [data]);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Giờ cao điểm user hoạt động
          </h3>

          <p
            style={{
              margin: "8px 0 0",
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Theo dõi biến động user online trong ngày
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "#f0fdf4",
              border: "1px solid #dcfce7",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              Peak hour
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>
              {peakHour ? peakHour.hour : "--"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              User cao nhất
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              {peakHour ? peakHour.users : 0}
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
              Giờ có hoạt động
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
              {activeHours}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: "#6b7280",
          }}
        >
          Ngày: {date || "Hôm nay"}
        </span>

        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#cbd5e1",
            display: "inline-block",
          }}
        />

        <span
          style={{
            fontSize: 14,
            color: "#16a34a",
            fontWeight: 700,
          }}
        >
          {peakHour
            ? `Khung giờ cao điểm: ${peakHour.hour} • ${peakHour.users} user`
            : "Chưa có dữ liệu"}
        </span>

        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#cbd5e1",
            display: "inline-block",
          }}
        />

        <span
          style={{
            fontSize: 14,
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          Tổng user tích lũy: {totalUsersInDay}
        </span>
      </div>

      {loading && <p>Đang tải biểu đồ...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div
          style={{
            width: "100%",
            height: 360,
            borderRadius: 18,
            background:
              "linear-gradient(180deg, rgba(22,163,74,0.05) 0%, rgba(255,255,255,1) 35%)",
            border: "1px solid #f1f5f9",
            padding: 12,
          }}
        >
          <ResponsiveContainer>
            <AreaChart
              data={data}
              margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="onlineUsersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                  <stop offset="75%" stopColor="#22c55e" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#e5e7eb"
              />

              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                interval={0}
                tickMargin={10}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(value: string) => {
                  const hour = Number(value.split(":")[0]);
                  return hour % 2 === 0 ? value : "";
                }}
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fontSize: 12, fill: "#64748b" }}
                domain={[0, (dataMax: number) => Math.max(dataMax + 1, 4)]}
              />

              <Tooltip
                cursor={{ stroke: "#86efac", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={<CustomTooltip />}
              />

              <Area
                type="monotone"
                dataKey="users"
                stroke="#16a34a"
                strokeWidth={3}
                fill="url(#onlineUsersFill)"
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#ffffff",
                  stroke: "#16a34a",
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 3,
                  fill: "#ffffff",
                  stroke: "#16a34a",
                }}
              />

              {peakHour && (
                <ReferenceDot
                  x={peakHour.hour}
                  y={peakHour.users}
                  r={7}
                  fill="#16a34a"
                  stroke="#ffffff"
                  strokeWidth={3}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}