namespace WebApi.PoC.Dtos
{
    public class CreatePoiRequestDto
    {
        public int Order { get; set; }
        public int? Range { get; set; }
        public IFormFile? Thumbnail { get; set; }
        public IFormFile? Banner { get; set; }
        // URL ảnh cũ — dùng khi update mà không upload ảnh mới
        public string? ExistingThumbnail { get; set; }
        public string? ExistingBanner { get; set; }
        public PositionDto Position { get; set; }
        public List<PoiLocalizedDto> LocalizedData { get; set; }
    }
}