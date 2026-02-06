using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Dtos;
using WebApi.PoC.Services.IServices;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

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
    // GET: api/<PoiController>
    [HttpGet("get-all")]
    public async Task<IActionResult> Get()
    {
        var pois = await _poiService.GetAllPOIsAsync();
        return Ok(pois);
    }

    [HttpGet("get-by-id/{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var poi = await _poiService.GetPoiByIdAsync(id);
        if (poi == null)
        {
            return NotFound();
        }
        return Ok(poi);
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] PoiDto poiDto, [FromQuery] Guid tourId)
    {
        var createdPoi = await _poiService.AddNewPoi(poiDto, tourId);
        if (createdPoi == null)
        {
            return BadRequest();
        }
        return Ok(createdPoi);
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] PoiDto poiDto)
    {
        var updatedPoi = await _poiService.UpdatePoiAsync(poiDto);
        if (updatedPoi == null)
        {
            return NotFound();
        }
        return Ok(updatedPoi);
    }

}
