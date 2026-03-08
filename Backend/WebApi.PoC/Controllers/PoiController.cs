using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Dtos;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Controllers;

[Route("api/pois")]
[ApiController]
public class PoiController : ControllerBase
{
    private readonly IPOIService _poiService;

    public PoiController(IPOIService poiService)
    {
        _poiService = poiService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var pois = await _poiService.GetAllPOIsAsync();
        return Ok(new { data = pois });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var poi = await _poiService.GetPoiByIdAsync(id);
        if (poi == null)
        {
            return NotFound(new
            {
                error = new
                {
                    code = "POI_NOT_FOUND",
                    message = "POI not found."
                }
            });
        }

        return Ok(new { data = poi });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PoiDto poiDto)
    {
        var createdPoi = await _poiService.AddNewPoi(poiDto);
        if (createdPoi == null)
        {
            return BadRequest(new
            {
                error = new
                {
                    code = "POI_CREATE_FAILED",
                    message = "Failed to create POI."
                }
            });
        }

        return Ok(new { data = createdPoi });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] PoiDto poiDto)
    {
        var updatedPoi = await _poiService.UpdatePoiAsync(id, poiDto);
        if (updatedPoi == null)
        {
            return NotFound(new
            {
                error = new
                {
                    code = "POI_NOT_FOUND",
                    message = "POI not found."
                }
            });
        }

        return Ok(new { data = updatedPoi });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _poiService.DeletePoiAsync(id);
        if (!deleted)
        {
            return NotFound(new
            {
                error = new
                {
                    code = "POI_NOT_FOUND",
                    message = "POI not found."
                }
            });
        }

        return Ok(new { data = true });
    }
}