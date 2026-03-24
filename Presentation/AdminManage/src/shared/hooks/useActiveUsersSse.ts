import { useEffect, useState } from "react";
import type { ActiveUsersResponse } from "@/shared/api/sessionApi";

const API_BASE =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:5111/api";

export function useActiveUsersSse() {
  const [data, setData] = useState<ActiveUsersResponse>({
    total: 0,
    sessions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE}/admin/active-users/stream`);

    const handleActiveUsers = (event: Event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as ActiveUsersResponse;
        setData(parsed);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.addEventListener("activeUsers", handleActiveUsers);

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setError("Mất kết nối realtime");
      setLoading(false);
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener("activeUsers", handleActiveUsers);
      eventSource.close();
    };
  }, []);

  return { data, loading, error };
}