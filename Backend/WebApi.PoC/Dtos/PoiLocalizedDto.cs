namespace WebApi.PoC.Dtos;

public class PoiLocalizedDto
{
    public string LangCode { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }

    public string DescriptionText { get; set; }
    public string DescriptionAudio { get; set; }
}
