using Microsoft.EntityFrameworkCore;
using WebApi.PoC.Dtos;
using WebApi.PoC.Models;
using WebApi.PoC.Services;
using WebApi.PoC.Services.IServices;
using StackExchange.Redis;
using WebApi.PoC.Models;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var redisSettings = builder.Configuration.GetSection("Redis").Get<RedisSettings>() ?? new RedisSettings();
builder.Services.AddSingleton(redisSettings);
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(redisSettings.ConnectionString));



// Đọc connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Thêm DbContext vào DI container  
//builder.Services.AddDbContext<AppDbContext>(options =>
//    options.UseSqlServer(connectionString));
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure() // optional resilience
    ));

//Use mapper
builder.Services.AddAutoMapper(cfg => cfg.AddProfile<DataMapping>());

// Cloudinary Configuration
builder.Services.Configure<CloudinarySetting>(
    builder.Configuration.GetSection("CloudinarySettings"));
// Add services to the container.

builder.Services.AddScoped<IPOIService, POIService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPOIService, POIService>();
builder.Services.AddScoped<ITourService, TourService>();
builder.Services.AddSingleton<RedisSessionStore>();
builder.Services.AddScoped<ISessionTrackingService, SessionTrackingService>();
builder.Services.AddHostedService<OnlineUserTrendSnapshotService>();

// Add multilingual services
builder.Services.AddScoped<IOllamaService, OllamaService>();
builder.Services.AddScoped<ITranslationService, TranslationService>();
builder.Services.AddScoped<IPiperTtsService, PiperTtsService>();
builder.Services.AddScoped<ISpeechToTextService, SpeechToTextService>();
builder.Services.AddScoped<IMultilingualGeneratorService, MultilingualGeneratorService>();


builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseCors("AllowAll");
app.Use(async (context, next) =>
{
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 200;
        return;
    }
    await next();
});
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
