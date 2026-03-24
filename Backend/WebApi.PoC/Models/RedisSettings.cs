namespace WebApi.PoC.Models
{
    public class RedisSettings
    {
        public string ConnectionString { get; set; } = "localhost:6379";
        public int SessionTtlSeconds { get; set; } = 90;
    }
}