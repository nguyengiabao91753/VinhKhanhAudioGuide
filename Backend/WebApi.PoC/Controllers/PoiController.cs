using Microsoft.AspNetCore.Mvc;
using WebApi.PoC.Dtos;
using WebApi.PoC.Services.IServices;
using System.Net;
using System.Net.Sockets;

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
    public async Task<IActionResult> Post([FromForm] CreatePoiRequestDto request)
    {
        try
        {
            Console.WriteLine($"========== POI CREATE START ==========");
            Console.WriteLine($"LocalizedData count: {request?.LocalizedData?.Count}");
            if (request?.LocalizedData != null)
            {
                foreach (var item in request.LocalizedData)
                {
                    var audioLen = item.DescriptionAudio?.Length ?? 0;
                    var audioDesc = string.IsNullOrEmpty(item.DescriptionAudio) ? "empty" : $"{audioLen} bytes";
                    Console.WriteLine($"  - {item.LangCode}: {item.Description?.Substring(0, Math.Min(30, item.Description?.Length ?? 0)) ?? "null"}... | audio: {audioDesc}");
                }
            }

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

            // Process audio files from multilingual generation
            var processedLocalizedData = new List<PoiLocalizedDto>();
            foreach (var item in request.LocalizedData)
            {
                var processedItem = new PoiLocalizedDto
                {
                    LangCode = item.LangCode,
                    Name = item.Name,
                    Description = item.Description,
                    DescriptionText = item.DescriptionText,
                    DescriptionAudio = item.DescriptionAudio
                };

                // Handle audio: if descriptionAudio is base64, upload to Cloudinary
                if (!string.IsNullOrEmpty(item.DescriptionAudio) && IsBase64Audio(item.DescriptionAudio))
                {
                    try
                    {
                        Console.WriteLine($"Uploading audio for {item.LangCode}...");
                        var audioBytes = ConvertBase64ToBytes(item.DescriptionAudio);
                        var fileName = $"poi_{Guid.NewGuid()}_{item.LangCode}.wav";
                        var audioUrl = await _cloudinaryService.UploadAudioAsync(
                            new MemoryStream(audioBytes),
                            fileName
                        );

                        if (!string.IsNullOrEmpty(audioUrl))
                        {
                            processedItem.DescriptionAudio = audioUrl;
                            Console.WriteLine($"✓ {item.LangCode}: {audioUrl}");
                        }
                        else
                        {
                            Console.WriteLine($"✗ {item.LangCode}: Cloudinary returned null");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"✗ {item.LangCode}: {ex.Message}");
                    }
                }

                processedLocalizedData.Add(processedItem);
            }

            var poiDto = new PoiDto
            {
                Order = request.Order,
                Range = request.Range,
                Thumbnail = thumbnailUrl,
                Banner = bannerUrl,
                Position = request.Position,
                LocalizedData = processedLocalizedData
            };

            Console.WriteLine($"Saving to database...");
            var createdPoi = await _poiService.AddNewPoi(poiDto, Guid.Empty);
            if (createdPoi == null)
            {
                Console.WriteLine($"✗ AddNewPoi returned null");
                return BadRequest("Failed to create POI.");
            }
            Console.WriteLine($"✓ POI saved: {createdPoi.Id}");
            Console.WriteLine($"========== POI CREATE END ==========");
            return Ok(createdPoi);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ EXCEPTION: {ex.Message}");
            Console.WriteLine($"{ex.StackTrace}");
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

            // Process audio files from multilingual generation (same as POST)
            var processedLocalizedData = new List<PoiLocalizedDto>();
            foreach (var item in request.LocalizedData)
            {
                var processedItem = new PoiLocalizedDto
                {
                    LangCode = item.LangCode,
                    Name = item.Name,
                    Description = item.Description,
                    DescriptionText = item.DescriptionText,
                    DescriptionAudio = item.DescriptionAudio
                };

                // Handle audio: if descriptionAudio is base64, upload to Cloudinary
                if (!string.IsNullOrEmpty(item.DescriptionAudio) && IsBase64Audio(item.DescriptionAudio))
                {
                    try
                    {
                        var audioBytes = ConvertBase64ToBytes(item.DescriptionAudio);
                        var fileName = $"poi_{guid}_{item.LangCode}.wav";
                        var audioUrl = await _cloudinaryService.UploadAudioAsync(
                            new MemoryStream(audioBytes),
                            fileName
                        );

                        if (!string.IsNullOrEmpty(audioUrl))
                        {
                            processedItem.DescriptionAudio = audioUrl;
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to upload audio for {item.LangCode}: {ex.Message}");
                    }
                }

                processedLocalizedData.Add(processedItem);
            }

            var poiDto = new PoiDto
            {
                Id = guid,
                Order = request.Order,
                Range = request.Range,
                Thumbnail = thumbnailUrl,
                Banner = bannerUrl,
                Position = request.Position,
                LocalizedData = processedLocalizedData
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

    /// <summary>
    /// Check if string contains base64 encoded audio data
    /// </summary>
    private bool IsBase64Audio(string data)
    {
        if (string.IsNullOrEmpty(data)) return false;

        // Check if it's data URI format: data:audio/wav;base64,xxx
        if (data.StartsWith("data:audio"))
            return true;

        // Try to detect if it's valid base64
        try
        {
            Convert.FromBase64String(data);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Convert base64 string (with or without data URI prefix) to bytes
    /// </summary>
    private byte[] ConvertBase64ToBytes(string base64Data)
    {
        // Remove data URI prefix if present
        if (base64Data.StartsWith("data:audio"))
        {
            base64Data = base64Data.Split(",")[1];
        }

        return Convert.FromBase64String(base64Data);
    }

    // New endpoint to get local IP for QR code generation
    [HttpGet("local-ip")]
    public IActionResult GetLocalIp()
    {
        var host = Dns.GetHostEntry(Dns.GetHostName());
        var localIp = host.AddressList.FirstOrDefault(ip => ip.AddressFamily == AddressFamily.InterNetwork)?.ToString();
        return Ok(new { ip = localIp ?? "127.0.0.1" });
    }
}
