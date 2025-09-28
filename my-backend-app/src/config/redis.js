const Redis = require('ioredis');
const config = require('./index');

let redisClient = null;

/**
 * Create Redis client with AWS ElastiCache support
 */
async function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Get the current configuration (may be from AWS Secrets Manager)
    const currentConfig = typeof config === 'function' ? await config.getConfig() : config;
    
    const redisConfig = {
      host: currentConfig.redis.host,
      port: currentConfig.redis.port,
      family: 4, // 4 (IPv4) or 6 (IPv6)
      connectTimeout: 10000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    };

    // Add authentication if provided
    if (currentConfig.redis.username) {
      redisConfig.username = currentConfig.redis.username;
    }
    
    if (currentConfig.redis.password) {
      redisConfig.password = currentConfig.redis.password;
    }

    // Configure TLS for AWS ElastiCache
    if (currentConfig.redis.tls) {
      redisConfig.tls = {
        // For AWS ElastiCache, we typically don't need to verify certificates
        rejectUnauthorized: false,
        servername: currentConfig.redis.host,
      };
    }

    // Cluster configuration for AWS ElastiCache Redis Cluster
    if (currentConfig.redis.cluster) {
      redisClient = new Redis.Cluster(currentConfig.redis.cluster, {
        enableOfflineQueue: false,
        redisOptions: redisConfig,
      });
    } else {
      redisClient = new Redis(redisConfig);
    }

    // Event listeners
    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    redisClient.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    redisClient.on('close', () => {
      console.log('Redis client connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });

    // Test the connection
    await redisClient.ping();
    console.log('Redis connection established successfully');

    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    throw error;
  }
}

/**
 * Get existing Redis client or create a new one
 */
async function getRedisClient() {
  if (!redisClient) {
    return await createRedisClient();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis client disconnected');
  }
}

/**
 * Health check for Redis connection
 */
async function healthCheck() {
  try {
    const client = await getRedisClient();
    const result = await client.ping();
    return {
      status: 'healthy',
      response: result,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// For backwards compatibility, create the client synchronously if using local config
if (config && typeof config !== 'function') {
  const redisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    family: 4,
    connectTimeout: 10000,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
  };

  if (config.redis.password) {
    redisOptions.password = config.redis.password;
  }

  if (config.redis.username) {
    redisOptions.username = config.redis.username;
  }

  if (config.redis.tls) {
    redisOptions.tls = {
      rejectUnauthorized: false,
      servername: config.redis.host,
    };
  }

  redisClient = new Redis(redisOptions);

  // Handle connection errors gracefully
  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  // Log successful connection
  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });
}

module.exports = redisClient || {
  getRedisClient,
  createRedisClient,
  closeRedisClient,
  healthCheck,
};