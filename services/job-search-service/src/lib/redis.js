const Redis = require("ioredis");

let redis;

const connectRedis = async () => {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });
  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", (err) => console.error("Redis error:", err.message));
};

const cacheGet = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const cacheSet = async (key, value, ttl = 300) => {
  try { await redis.setex(key, ttl, JSON.stringify(value)); }
  catch (err) { console.error("Cache set error:", err.message); }
};

module.exports = { connectRedis, cacheGet, cacheSet };
