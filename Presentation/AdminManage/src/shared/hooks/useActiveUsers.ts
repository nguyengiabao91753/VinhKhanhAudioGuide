import { useCallback, useEffect, useState } from "react";
import { getActiveUsers, type ActiveUsersResponse } from "@/shared/api/sessionApi";

export function useActiveUsers() {
  const [data, setData] = useState<ActiveUsersResponse>({
    total: 0,
    sessions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveUsers = useCallback(async () => {
    try {
      const result = await getActiveUsers();
      setData(result);
      setError(null);
    } catch (err) {
      setError("Không tải được dữ liệu user online");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveUsers();

    const intervalId = window.setInterval(() => {
      fetchActiveUsers();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchActiveUsers]);

  return {
    data,
    loading,
    error,
    refetch: fetchActiveUsers,
  };
}