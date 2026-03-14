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
    private readonly ICloudinaryService _cloudinaryService;
    public PoiController(IPOIService poiService, ICloudinaryService cloudinaryService)
    {
        _poiService = poiService;
        _cloudinaryService = cloudinaryService;
    }
    // GET: api/<PoiController>
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var pois = await _poiService.GetAllPOIsAsync();
        return Ok(pois);
    }

    [HttpGet("{id}")]
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
    public async Task<IActionResult> Post([FromForm] CreatePoiRequestDto request, [FromQuery] Guid tourId)
    {
        try
        {
            string? thumbnailUrl = null;
            string? bannerUrl = null;

            if (request.Thumbnail != null)
            {
                var uploadResult = await _cloudinaryService.UploadImageAsync(request.Thumbnail);
                thumbnailUrl = uploadResult;
            }

            if (request.Banner != null)
            {
                var uploadResult = await _cloudinaryService.UploadImageAsync(request.Banner);
                bannerUrl = uploadResult;
            }

            var poiDto = new PoiDto
            {
                Order = request.Order,
                Range = request.Range,
                Thumbnail = thumbnailUrl,
                Banner = bannerUrl,
                Position = request.Position,
                LocalizedData = request.LocalizedData
            };

            var createdPoi = await _poiService.AddNewPoi(poiDto, tourId);
            if (createdPoi == null)
            {
                return BadRequest("Failed to create POI.");
            }
            return Ok(createdPoi);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }

    [HttpPut("{guid}")]
    public async Task<IActionResult> Update(Guid guid, [FromForm] CreatePoiRequestDto request)
    {
        try
        {
            string? thumbnailUrl = null;
            string? bannerUrl = null;

            if (request.Thumbnail != null)
            {
                var uploadResult = await _cloudinaryService.UploadImageAsync(request.Thumbnail);
                thumbnailUrl = uploadResult;
            }

            if (request.Banner != null)
            {
                var uploadResult = await _cloudinaryService.UploadImageAsync(request.Banner);
                bannerUrl = uploadResult;
            }

            var poiDto = new PoiDto
            {
                Id = guid,
                Order = request.Order,
                Range = request.Range,
                Thumbnail = thumbnailUrl,
                Banner = bannerUrl,
                Position = request.Position,
                LocalizedData = request.LocalizedData
            };

            var updatedPoi = await _poiService.UpdatePoiAsync(poiDto);
            if (updatedPoi == null)
            {
                return BadRequest("Failed to update POI.");
            }

            return Ok(updatedPoi);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var affectedTours = _poiService.DeletePoiAsync(id);
        if (affectedTours == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            affectedTours
        }
            );
    }
}
