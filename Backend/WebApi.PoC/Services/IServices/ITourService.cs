using WebApi.PoC.Dtos;

namespace WebApi.PoC.Services.IServices;

public interface ITourService
{
    Task<IEnumerable<TourDto>> GetAllToursAsync();
    Task<TourDto?> GetTourByIdAsync(Guid id);
    Task<TourDto?> AddNewTour(TourDto tourDto);
    Task<TourDto?> UpdateTourAsync(Guid id, TourDto tourDto);
    Task<bool> DeleteTourAsync(Guid id);
}