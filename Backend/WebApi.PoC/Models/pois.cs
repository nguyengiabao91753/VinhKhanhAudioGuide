using System;
using System.Collections.Generic;

namespace WebApi.PoC.Models;

public partial class pois
{
    public Guid _id { get; set; }

    public string? localizedData { get; set; }

    public string? thumbnail { get; set; }

    public string? banner { get; set; }

    public Guid? position_id { get; set; }

    public int? range { get; set; }

    public virtual ICollection<pois_localizedData> pois_localizedData { get; set; } = new List<pois_localizedData>();

    public virtual position? position { get; set; }

    public virtual ICollection<tour_points> tour_points { get; set; } = new List<tour_points>();
}
