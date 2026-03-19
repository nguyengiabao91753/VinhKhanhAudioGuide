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
            foreach (var ld in poiDto.LocalizedData)
            {
                Console.WriteLine($"[DB SAVE] lang={ld.LangCode} | descText={ld.DescriptionText}");
            }
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
            foreach (var ld in poiDto.LocalizedData)
            {
                Console.WriteLine($"[DB SAVE] lang={ld.LangCode} | descText={ld.DescriptionText}");
            }
            await _db.pois.AddAsync(poi);

            await _db.SaveChangesAsync();
            if (tourId != Guid.Empty)
            {
                _db.tour_points.Add(new tour_points
                {
                    tour_point_id = poi._id,
                    id_tour = tourId,
                    order = poiDto.Order
                });

                await _db.SaveChangesAsync();
            }

            poiDto.Id = poi._id;
            return poiDto;
        }
        catch (Exception ex)
        {
            throw;
        }
    }
    public async Task<IEnumerable<PoiDto>> GetAllPOIsAsync()
    {
        var pois = await _db.pois
            .Include(p => p.position)
            .Include(p => p.pois_localizedData)
            .Select(p => new PoiDto
            {
                Id = p._id,
                Range = p.range,
                Thumbnail = p.thumbnail,
                Banner = p.banner,
                Position = new PositionDto
                {
                    Type = p.position.type,
                    Lat = p.position.coordinates_y,
                    Lng = p.position.coordinates_x
                },
                LocalizedData = p.pois_localizedData
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

    public async Task<PoiDto?> GetPoiByIdAsync(Guid id)
    {
        var poi = await _db.pois
            .Include(p => p.position)
            .Include(p => p.pois_localizedData)
            .Where(p => p._id == id)
            .Select(p => new PoiDto
            {
                Id = p._id,
                Range = p.range,
                Thumbnail = p.thumbnail,
                Banner = p.banner,
                Position = new PositionDto
                {
                    Type = p.position.type,
                    Lat = p.position.coordinates_y,
                    Lng = p.position.coordinates_x
                },
                LocalizedData = p.pois_localizedData
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
    public async Task<PoiDto?> UpdatePoiAsync(Guid id, PoiDto poiDto)
    {
        var poi = await _db.pois
            .Include(p => p.position)
            .Include(p => p.pois_localizedData)
            .FirstOrDefaultAsync(p => p._id == id);

        if (poi == null)
            return null;

        if (poiDto.Position == null)
            throw new ArgumentException("Position is required.");

        if (poiDto.Position.Lat == 0 || poiDto.Position.Lng == 0)
            throw new ArgumentException("Lat/Lng cannot be 0.");

        poi.range = poiDto.Range;
        poi.thumbnail = poiDto.Thumbnail;
        poi.banner = poiDto.Banner;

        poi.position.type = poiDto.Position.Type;
        poi.position.coordinates_x = poiDto.Position.Lng;
        poi.position.coordinates_y = poiDto.Position.Lat;

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
            else
            {
                poi.pois_localizedData.Add(new pois_localizedData
                {
                    lang_code = ldDto.LangCode,
                    name = ldDto.Name,
                    description = ldDto.Description,
                    description_text = ldDto.DescriptionText,
                    description_audio = ldDto.DescriptionAudio
                });
            }
        }

        await _db.SaveChangesAsync();

        poiDto.Id = poi._id;
        return poiDto;
    }

    //public async Task<bool> DeletePoiAsync(Guid id)
    //{
    //    var poi = await _db.pois
    //        .Include(p => p.pois_localizedData)
    //        .Include(p => p.position)
    //        .FirstOrDefaultAsync(p => p._id == id);

    //    if (poi == null)
    //        return false;

    //    var tourPoints = await _db.tour_points
    //        .Where(tp => tp.tour_point_id == id)
    //        .ToListAsync();

    //    if (tourPoints.Any())
    //    {
    //        _db.tour_points.RemoveRange(tourPoints);
    //    }

    //    if (poi.pois_localizedData != null && poi.pois_localizedData.Any())
    //    {
    //        _db.pois_localizedData.RemoveRange(poi.pois_localizedData);
    //    }

    //    if (poi.position != null)
    //    {
    //        _db.position.Remove(poi.position);
    //    }

    //    _db.pois.Remove(poi);
    //    await _db.SaveChangesAsync();

    //    return true;
    //}

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
