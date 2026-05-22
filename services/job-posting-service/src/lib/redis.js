const Redis = require("ioredis");

let redis;

const connectRedis = async () => {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", (err) => console.error("Redis error:", err.message));
  return redis;
};

const getRedis = () => {
  if (!redis) throw new Error("Redis not connected");
  return redis;
};

// Cache helpers
const CACHE_TTL = 60 * 60; // 1 hour

const cacheGet = async (key) => {
  try {
    const r = getRedis();
    const data = await r.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const cacheSet = async (key, value, ttl = CACHE_TTL) => {
  try {
    const r = getRedis();
    await r.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.error("Cache set error:", err.message);
  }
};

const cacheDel = async (key) => {
  try {
    const r = getRedis();
    await r.del(key);
  } catch (err) {
    console.error("Cache del error:", err.message);
  }
};

const cacheDelPattern = async (pattern) => {
  try {
    const r = getRedis();
    const keys = await r.keys(pattern);
    if (keys.length) await r.del(...keys);
  } catch (err) {
    console.error("Cache del pattern error:", err.message);
  }
};

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheDel, cacheDelPattern };
