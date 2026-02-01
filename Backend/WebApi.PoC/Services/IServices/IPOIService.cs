using WebApi.PoC.Dtos;

namespace WebApi.PoC.Services.IServices;

public interface IPOIService
{
    Task<IEnumerable<PoiDto>> GetAllPOIsAsync();
}
