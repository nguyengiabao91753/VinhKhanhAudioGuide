import { useEffect } from "react";
import { sendSessionPing } from "./sessionHeartbeat";

type UseSessionHeartbeatParams = {
  lang?: string;
  currentPoiId?: string | null;
  tourId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export function useSessionHeartbeat({
  lang = "vi",
  currentPoiId = null,
  tourId = null,
  lat = null,
  lng = null,
}: UseSessionHeartbeatParams) {
  useEffect(() => {
    let mounted = true;

    const ping = async () => {
      try {
        await sendSessionPing({
          lang,
          currentPoiId,
          tourId,
          lat,
          lng,
        });
      } catch (error) {
        console.error("Session heartbeat failed:", error);
      }
    };

    if (mounted) {
      ping();
    }

    const intervalId = window.setInterval(() => {
      ping();
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [lang, currentPoiId, tourId, lat, lng]);
}