using System;
using System.Collections.Generic;

namespace WebApi.PoC.Models;

public partial class position
{
    public Guid _id { get; set; }

    public string? type { get; set; }

    public double coordinates_x { get; set; }

    public double coordinates_y { get; set; }

    public virtual ICollection<pois> pois { get; set; } = new List<pois>();
}
