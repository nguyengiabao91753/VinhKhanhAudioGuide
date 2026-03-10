using WebApi.PoC.Dtos;

namespace WebApi.PoC.Services.IServices;

public interface IPOIService
{
    Task<IEnumerable<PoiDto>> GetAllPOIsAsync();
    Task<PoiDto?> GetPoiByIdAsync(Guid id);
    Task<PoiDto?> UpdatePoiAsync(PoiDto poiDto);

    Task<IEnumerable<Guid>?> DeletePoiAsync(Guid id);
}
