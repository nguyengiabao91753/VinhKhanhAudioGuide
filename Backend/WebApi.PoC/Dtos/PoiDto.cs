namespace WebApi.PoC.Dtos;

public class PoiDto
{
    public Guid Id { get; set; }

    public int Order { get; set; }
    public int? Range { get; set; }

    public string Thumbnail { get; set; }
    public string Banner { get; set; }

    public PositionDto Position { get; set; }

    public List<PoiLocalizedDto> LocalizedData { get; set; }
}