const { createClient } = require('redis');
const config = require('./index');

// Create a Redis client instance
const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password, // Add password if needed
});

// Handle connection errors gracefully
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connect to Redis (optional: only connect when needed)
(async () => {
  await redisClient.connect();
  console.log('Redis client connected');
})();

module.exports = redisClient;