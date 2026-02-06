using ManagementSystem;
using ManagementSystem.Dtos;
using ManagementSystem.Services;
using ManagementSystem.Services.IServices;
using ManagementSystem.Utilities;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.Extensions.DependencyInjection; // Add this using directive
using System.Net.Http; // Add this using directive
using Microsoft.Extensions.Http; // Add this using directive

var builder = WebAssemblyHostBuilder.CreateDefault(args);

SD.APIBaseUrl = builder.Configuration["APIUrl"];
builder.Services.AddHttpClient<IPoiClientService, PoiClientService>(client =>
{
    client.BaseAddress = new Uri(SD.APIBaseUrl);
});

builder.Services.AddScoped<IPoiClientService, PoiClientService>();

builder.Services.AddScoped(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return new MapBoxOptions
    {
        ApiKey = config["MAPBOX_KEY"]
    };
});

builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

await builder.Build().RunAsync();
