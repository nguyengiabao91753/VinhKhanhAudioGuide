using System;
using System.Collections.Generic;

namespace WebApi.PoC.Models;

public partial class tour_points
{
    public Guid _id { get; set; }

    public Guid tour_point_id { get; set; }

    public Guid id_tour { get; set; }

    public int order { get; set; }

    public virtual tour id_tourNavigation { get; set; } = null!;

    public virtual pois tour_point { get; set; } = null!;
}
