using WebApi.PoC.Dtos;

namespace WebApi.PoC.Services.IServices;

public interface IPOIService
{
    Task<IEnumerable<PoiDto>> GetAllPOIsAsync();
    Task<PoiDto?> GetPoiByIdAsync(Guid id);
    Task<PoiDto?> AddNewPoi(PoiDto poiDto);
    Task<PoiDto?> UpdatePoiAsync(Guid id, PoiDto poiDto);
    Task<bool> DeletePoiAsync(Guid id);
}