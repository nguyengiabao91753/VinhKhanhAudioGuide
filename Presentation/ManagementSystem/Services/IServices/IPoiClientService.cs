using ManagementSystem.Dtos;

namespace ManagementSystem.Services.IServices;

public interface IPoiClientService
{
    Task<List<PoiDto>?> GetAllPoisAsync();
    Task<PoiDto?> GetPoiByIdAsync(Guid id);
    Task<PoiDto?> CreatePoiAsync(PoiDto poiDto, Guid tourId);
    Task<PoiDto?> UpdatePoiAsync(PoiDto poiDto);
}
