using System;
using System.Collections.Generic;

namespace WebApi.PoC.Models;

public partial class tour
{
    public Guid _id { get; set; }

    public string name { get; set; } = null!;

    public virtual ICollection<tour_points> tour_points { get; set; } = new List<tour_points>();
}
