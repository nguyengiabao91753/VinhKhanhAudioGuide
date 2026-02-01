using System;
using System.Collections.Generic;

namespace WebApi.PoC.Models;

public partial class pois_localizedData
{
    public Guid pois_id { get; set; }

    public string lang_code { get; set; } = null!;

    public string? name { get; set; }

    public string? description { get; set; }

    public string? description_text { get; set; }

    public string? description_audio { get; set; }

    public virtual pois pois { get; set; } = null!;
}
