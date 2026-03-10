namespace WebApi.PoC.Dtos;

public class TourDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<Guid> PoiIds { get; set; } = new();
}