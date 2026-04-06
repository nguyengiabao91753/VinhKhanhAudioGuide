namespace WebApi.PoC.Models
{
    public class VisitorSession
    {
        public long Id { get; set; }

        public string SessionId { get; set; } = string.Empty;

        public string DeviceInstanceId { get; set; } = string.Empty;
        public string DeviceDisplayName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = "desktop";
        public string? DeviceModel { get; set; }
        public string? BrowserName { get; set; }
        public string? OsName { get; set; }

        public string Lang { get; set; } = "vi";
        public string? Timezone { get; set; }
        public int? ScreenWidth { get; set; }
        public int? ScreenHeight { get; set; }
        public string? UserAgentRaw { get; set; }

        public string? CurrentPoiId { get; set; }
        public string? CurrentPoiName { get; set; }

        public string? TourId { get; set; }
        public string? TourName { get; set; }

        public double? Lat { get; set; }
        public double? Lng { get; set; }

        public DateTime StartedAt { get; set; }
        public DateTime LastSeenAt { get; set; }
        public DateTime? EndedAt { get; set; }

        public string Status { get; set; } = "online";

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}