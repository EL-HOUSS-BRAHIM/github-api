require('dotenv').config();
const Redis = require('ioredis');
const config = require('../src/config');

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
});

async function clearCache() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');

    await redisClient.flushall();
    console.log('Redis cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  } finally {
    await redisClient.quit();
  }
}

clearCache();