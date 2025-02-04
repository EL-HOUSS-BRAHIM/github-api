const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: {},
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('connect', async () => {
  console.log('Connected to Redis');
  try {
    await redis.flushall();
    console.log('Redis cache cleared successfully');
  } catch (error) {
    console.error('Error clearing Redis:', error);
  } finally {
    await redis.quit();
    process.exit(0);
  }
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
  process.exit(1);
});