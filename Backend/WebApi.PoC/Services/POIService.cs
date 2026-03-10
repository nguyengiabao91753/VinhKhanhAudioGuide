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

    public async Task<PoiDto?> AddNewPoi(PoiDto poiDto, Guid tourId)
    {
        try
        {
            var poi = new pois
            {
                range = poiDto.Range,
                thumbnail = poiDto.Thumbnail,
                banner = poiDto.Banner,
                position = new position
                {
                    type = poiDto.Position.Type,
                    coordinates_x = poiDto.Position.Lng,
                    coordinates_y = poiDto.Position.Lat
                },
                pois_localizedData = poiDto.LocalizedData.Select(ld => new pois_localizedData
                {
                    lang_code = ld.LangCode,
                    name = ld.Name,
                    description = ld.Description,
                    description_text = ld.DescriptionText,
                    description_audio = ld.DescriptionAudio
                }).ToList()
            };
            await _db.pois.AddAsync(poi);

            await _db.SaveChangesAsync();
            _db.tour_points.Add(new tour_points
            {
                tour_point_id = poi._id,
                id_tour = tourId,
                order = poiDto.Order
            });

            await _db.SaveChangesAsync();

            return poiDto;
        }
        catch (Exception ex)
        {
            throw;
        }
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

    public Task<PoiDto?> GetPoiByIdAsync(Guid id)
    {
        try
        {
            var poi = _db.tour_points
            .Where(tp => tp.tour_point._id == id)
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
            .FirstOrDefaultAsync();
            return poi;

        }
        catch (Exception ex)
        {
            throw;
        }
    }

    public async Task<PoiDto?> UpdatePoiAsync(PoiDto poiDto)
    {
        try
        {
            var poi = await _db.pois
                .Include(p => p.position)
                .Include(p => p.pois_localizedData)
                .FirstOrDefaultAsync(p => p._id == poiDto.Id);
            if (poi == null)
            {
                return null;
            }
            poi.range = poiDto.Range;
            poi.thumbnail = poiDto.Thumbnail;
            poi.banner = poiDto.Banner;
            poi.position.type = poiDto.Position.Type;
            poi.position.coordinates_x = poiDto.Position.Lng;
            poi.position.coordinates_y = poiDto.Position.Lat;
            // Update localized data
            foreach (var ldDto in poiDto.LocalizedData)
            {
                var ld = poi.pois_localizedData.FirstOrDefault(x => x.lang_code == ldDto.LangCode);
                if (ld != null)
                {
                    ld.name = ldDto.Name;
                    ld.description = ldDto.Description;
                    ld.description_text = ldDto.DescriptionText;
                    ld.description_audio = ldDto.DescriptionAudio;
                }
            }
            await _db.SaveChangesAsync();
            return poiDto;



        }
        catch (Exception ex)
        {
            return new PoiDto();

        }
    }

    public async Task<IEnumerable<Guid>?> DeletePoiAsync(Guid id)
    {
        try
        {
            var poi = await _db.pois
                .Include(p => p.pois_localizedData)
                .Include(p => p.position)
                .FirstOrDefaultAsync(p => p._id == id);

            if(poi == null)
            {
                return null;
            }

            var tourAffected = await _db.tour_points
                .Where(tp => tp.tour_point_id == id)
                .Select(tp => tp.id_tour)
                .ToListAsync();

            var tourPoints = await _db.tour_points
                .Where(tp => tp.tour_point_id == id)
                .ToListAsync();

            _db.tour_points.RemoveRange(tourPoints);

            _db.pois_localizedData.RemoveRange(poi.pois_localizedData);

            _db.position.RemoveRange(poi.position);

            _db.pois.Remove(poi);

            await _db.SaveChangesAsync();

            return tourAffected;
        }
        catch (Exception ex)
        {
            throw;
        }
    }
}
