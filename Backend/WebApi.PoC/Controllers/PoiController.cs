using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Services.IServices;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace WebApi.PoC.Controllers;
[Route("api/poi")]
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


}
