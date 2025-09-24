const Redis = require('ioredis');
const config = require('./index');

const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

if (config.redis.password) {
  redisOptions.password = config.redis.password;
}

if (config.redis.username) {
  redisOptions.username = config.redis.username;
}

if (config.redis.tls) {
  redisOptions.tls = config.redis.tls;
}

const redisClient = new Redis(redisOptions);

// Handle connection errors gracefully
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Log successful connection
redisClient.on('connect', () => {
  console.log('Redis client connected');
});

module.exports = redisClient;