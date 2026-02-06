namespace ManagementSystem.Dtos;

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


public class TourDto
{
    public Guid Id { get; set; }
    public string Name { get; set; }

    public List<PoiDto> Pois { get; set; }
}