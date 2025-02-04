const Redis = require('ioredis');
const config = require('./index');

// Create a Redis client instance using the connection string
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  username: 'default',
  tls: {}, // Enable TLS/SSL
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Handle connection errors gracefully
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Log successful connection
redisClient.on('connect', () => {
  console.log('Redis client connected');
});

module.exports = redisClient;