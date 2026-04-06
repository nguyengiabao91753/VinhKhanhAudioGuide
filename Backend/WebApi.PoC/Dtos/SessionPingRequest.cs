namespace WebApi.PoC.Dtos
{
    public class SessionPingRequest
    {
        public string SessionId { get; set; } = string.Empty;
        public string Lang { get; set; } = "vi";
        public string? CurrentPoiId { get; set; }
        public string? TourId { get; set; }
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public string? UserAgent { get; set; }

        // ===== New fields for device/session detail =====
        public string DeviceInstanceId { get; set; } = string.Empty;
        public string DeviceDisplayName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = "desktop";
        public string? DeviceModel { get; set; }
        public string? BrowserName { get; set; }
        public string? OsName { get; set; }

        public string? Timezone { get; set; }
        public int? ScreenWidth { get; set; }
        public int? ScreenHeight { get; set; }
        public string? UserAgentRaw { get; set; }

        public string? CurrentPoiName { get; set; }
        public string? TourName { get; set; }
    }
}