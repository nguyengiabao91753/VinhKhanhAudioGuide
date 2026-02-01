using Microsoft.EntityFrameworkCore;
using WebApi.PoC.Dtos;
using WebApi.PoC.Models;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class POIService : IPOIService
{
    private readonly AppDbContext _db;
    public POIService(AppDbContext db)
    {
        _db = db;
    }
    public async Task<IEnumerable<PoiDto>> GetAllPOIsAsync()
    {
        var pois = await _db.tour_points
        .OrderBy(tp => tp.order)
        .Select(tp => new PoiDto
        {
            Id = tp.tour_point._id,
            Order = tp.order,
            Range = tp.tour_point.range,
            Thumbnail = tp.tour_point.thumbnail,
            Banner = tp.tour_point.banner,

            Position = new PositionDto
            {
                Type = tp.tour_point.position.type,
                Lat = tp.tour_point.position.coordinates_y,
                Lng = tp.tour_point.position.coordinates_x
            },

            LocalizedData = tp.tour_point.pois_localizedData
                .Select(ld => new PoiLocalizedDto
                {
                    LangCode = ld.lang_code,
                    Name = ld.name,
                    Description = ld.description,
                    DescriptionText = ld.description_text,
                    DescriptionAudio = ld.description_audio
                })
                .ToList()
        })
        .AsNoTracking()
        .ToListAsync();

        return pois;
    }
}
