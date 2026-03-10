namespace WebApi.PoC.Dtos
{
    public class CreatePoiRequestDto
    {
        public int Order { get; set; }
        public int? Range { get; set; }
        public IFormFile? Thumbnail { get; set; }
        public IFormFile? Banner { get; set; }
        public PositionDto Position { get; set; }
        public List<PoiLocalizedDto> LocalizedData { get; set; }
    }
}
