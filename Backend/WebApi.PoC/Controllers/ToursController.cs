using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Dtos;
using WebApi.PoC.Services.IServices;

namespace WebApi.PoC.Controllers;

[Route("api/tours")]
[ApiController]
public class TourController : ControllerBase
{
    private readonly ITourService _tourService;

    public TourController(ITourService tourService)
    {
        _tourService = tourService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tours = await _tourService.GetAllToursAsync();
        return Ok(new { data = tours });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tour = await _tourService.GetTourByIdAsync(id);
        if (tour == null)
        {
            return NotFound(new
            {
                error = new
                {
                    code = "TOUR_NOT_FOUND",
                    message = "Tour not found."
                }
            });
        }

        return Ok(new { data = tour });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TourDto tourDto)
    {
        var createdTour = await _tourService.AddNewTour(tourDto);
        return Ok(new { data = createdTour });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] TourDto tourDto)
    {
        var updatedTour = await _tourService.UpdateTourAsync(id, tourDto);
        if (updatedTour == null)
        {
            return NotFound(new
            {
                error = new
                {
                    code = "TOUR_NOT_FOUND",
                    message = "Tour not found."
                }
            });
        }

        return Ok(new { data = updatedTour });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _tourService.DeleteTourAsync(id);
        if (!deleted)
        {
            return NotFound(new
            {
                error = new
                {
                    code = "TOUR_NOT_FOUND",
                    message = "Tour not found."
                }
            });
        }

        return Ok(new { data = true });
    }
}