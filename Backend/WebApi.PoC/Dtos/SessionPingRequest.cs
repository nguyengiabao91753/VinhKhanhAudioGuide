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
    }
}