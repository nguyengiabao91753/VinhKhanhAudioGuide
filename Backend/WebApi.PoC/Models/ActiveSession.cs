namespace WebApi.PoC.Models
{
    public class ActiveSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string Lang { get; set; } = "vi";
        public string? CurrentPoiId { get; set; }
        public string? TourId { get; set; }
        public double? Lat { get; set; }
        public double? Lng { get; set; }
        public string Device { get; set; } = "unknown";
        public DateTime FirstSeen { get; set; }
        public DateTime LastSeen { get; set; }
    }
}