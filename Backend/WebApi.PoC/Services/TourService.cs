using Microsoft.EntityFrameworkCore;
using WebApi.PoC.Dtos;
using WebApi.PoC.Models;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Services;

public class TourService : ITourService
{
    private readonly AppDbContext _db;

    public TourService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<TourDto>> GetAllToursAsync()
    {
        var tours = await _db.tour
            .Include(t => t.tour_points)
            .Select(t => new TourDto
            {
                Id = t._id,
                Name = t.name,
                PoiIds = t.tour_points
                    .OrderBy(tp => tp.order)
                    .Select(tp => tp.tour_point_id)
                    .ToList()
            })
            .AsNoTracking()
            .ToListAsync();

        return tours;
    }

    public async Task<TourDto?> GetTourByIdAsync(Guid id)
    {
        var tour = await _db.tour
            .Include(t => t.tour_points)
            .Where(t => t._id == id)
            .Select(t => new TourDto
            {
                Id = t._id,
                Name = t.name,
                PoiIds = t.tour_points
                    .OrderBy(tp => tp.order)
                    .Select(tp => tp.tour_point_id)
                    .ToList()
            })
            .AsNoTracking()
            .FirstOrDefaultAsync();

        return tour;
    }

    public async Task<TourDto?> AddNewTour(TourDto tourDto)
    {
        if (string.IsNullOrWhiteSpace(tourDto.Name))
            throw new ArgumentException("Tour name is required.");

        if (tourDto.PoiIds == null || !tourDto.PoiIds.Any())
            throw new ArgumentException("Tour must contain at least one POI.");

        var existingPoiIds = await _db.pois
            .Where(p => tourDto.PoiIds.Contains(p._id))
            .Select(p => p._id)
            .ToListAsync();

        if (existingPoiIds.Count != tourDto.PoiIds.Distinct().Count())
            throw new ArgumentException("One or more POIs do not exist.");

        var tour = new tour
        {
            name = tourDto.Name
        };

        await _db.tour.AddAsync(tour);
        await _db.SaveChangesAsync();

        var tourPoints = tourDto.PoiIds
            .Select((poiId, index) => new tour_points
            {
                _id = Guid.NewGuid(),
                id_tour = tour._id,
                tour_point_id = poiId,
                order = index
            })
            .ToList();

        await _db.tour_points.AddRangeAsync(tourPoints);
        await _db.SaveChangesAsync();

        tourDto.Id = tour._id;
        return tourDto;
    }

    public async Task<TourDto?> UpdateTourAsync(Guid id, TourDto tourDto)
    {
        var tour = await _db.tour
            .Include(t => t.tour_points)
            .FirstOrDefaultAsync(t => t._id == id);

        if (tour == null)
            return null;

        if (string.IsNullOrWhiteSpace(tourDto.Name))
            throw new ArgumentException("Tour name is required.");

        if (tourDto.PoiIds == null || !tourDto.PoiIds.Any())
            throw new ArgumentException("Tour must contain at least one POI.");

        var existingPoiIds = await _db.pois
            .Where(p => tourDto.PoiIds.Contains(p._id))
            .Select(p => p._id)
            .ToListAsync();

        if (existingPoiIds.Count != tourDto.PoiIds.Distinct().Count())
            throw new ArgumentException("One or more POIs do not exist.");

        tour.name = tourDto.Name;

        if (tour.tour_points.Any())
        {
            _db.tour_points.RemoveRange(tour.tour_points);
        }

        var newTourPoints = tourDto.PoiIds
            .Select((poiId, index) => new tour_points
            {
                _id = Guid.NewGuid(),
                id_tour = tour._id,
                tour_point_id = poiId,
                order = index
            })
            .ToList();

        await _db.tour_points.AddRangeAsync(newTourPoints);
        await _db.SaveChangesAsync();

        tourDto.Id = tour._id;
        return tourDto;
    }

    public async Task<bool> DeleteTourAsync(Guid id)
    {
        var tour = await _db.tour
            .Include(t => t.tour_points)
            .FirstOrDefaultAsync(t => t._id == id);

        if (tour == null)
            return false;

        if (tour.tour_points.Any())
        {
            _db.tour_points.RemoveRange(tour.tour_points);
        }

        _db.tour.Remove(tour);
        await _db.SaveChangesAsync();

        return true;
    }
}