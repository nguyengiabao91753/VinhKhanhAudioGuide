using ManagementSystem.Dtos;
using ManagementSystem.Services.IServices;
using ManagementSystem.Utilities;
using System.Net.Http.Json;

namespace ManagementSystem.Services;

public class PoiClientService : IPoiClientService
{
    private readonly HttpClient _http;
    public PoiClientService(HttpClient httpClient)
    {
        _http = httpClient;
    }
    public async Task<List<PoiDto>?> GetAllPoisAsync()
    {
        return await _http.GetFromJsonAsync<List<PoiDto>>(
            $"https://localhost:7047/api/pois/get-all");
    }

    public async Task<PoiDto?> GetPoiByIdAsync(Guid id)
    {
        return await _http.GetFromJsonAsync<PoiDto>(
            $"{SD.APIBaseUrl}/api/pois/get-by-id/{id}");
    }

    public async Task<PoiDto?> CreatePoiAsync(PoiDto poiDto, Guid tourId)
    {
        var response = await _http.PostAsJsonAsync(
            $"{SD.APIBaseUrl}/api/pois?tourId={tourId}",
            poiDto);

        if (!response.IsSuccessStatusCode)
            return null;

        return await response.Content.ReadFromJsonAsync<PoiDto>();
    }

    public async Task<PoiDto?> UpdatePoiAsync(PoiDto poiDto)
    {
        var response = await _http.PostAsJsonAsync(
            $"{SD.APIBaseUrl}/api/pois/update",
            poiDto);

        if (!response.IsSuccessStatusCode)
            return null;

        return await response.Content.ReadFromJsonAsync<PoiDto>();
    }
}
