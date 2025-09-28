require('dotenv').config();
const fs = require('fs');
const path = require('path');
const env = require('./env');
const secretsManager = require('../services/aws/secretsManager');

let isInitialized = false;
let cachedConfig = null;

function readCACertificate(filePath) {
  if (!filePath) {
    return null;
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`Database CA file not found at ${resolvedPath}. Continuing without SSL CA.`);
    return null;
  }

  try {
    return fs.readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    console.warn('Failed to read database CA file. Continuing without SSL CA.', error.message);
    return null;
  }
}

function buildSSLConfig(sslSettings) {
  if (!sslSettings) {
    return undefined;
  }

  const ca = readCACertificate(sslSettings.caPath);
  if (!ca) {
    return undefined;
  }

  return {
    ca,
    rejectUnauthorized: sslSettings.rejectUnauthorized,
  };
}

function validateProductionSecrets(envConfig) {
  if (envConfig.nodeEnv !== 'production') {
    return;
  }

  const missingSecrets = [];

  // In production with AWS, we don't need local env vars for these
  if (!process.env.AWS_DB_SECRET_NAME && !envConfig.db.password) {
    missingSecrets.push('DB_PASSWORD or AWS_DB_SECRET_NAME');
  }

  if (!process.env.AWS_REDIS_SECRET_NAME && !envConfig.redis.password) {
    missingSecrets.push('REDIS_PASSWORD or AWS_REDIS_SECRET_NAME');
  }

  if (!process.env.AWS_GITHUB_SECRET_NAME && !envConfig.githubTokens.length) {
    missingSecrets.push('GITHUB_TOKENS or AWS_GITHUB_SECRET_NAME');
  }

  if (missingSecrets.length > 0) {
    throw new Error(`Missing required production secrets: ${missingSecrets.join(', ')}`);
  }
}

/**
 * Initialize configuration with AWS Secrets Manager integration
 * This function should be called during application startup
 */
async function initializeConfig() {
  if (isInitialized && cachedConfig) {
    return cachedConfig;
  }

  console.log('Initializing configuration with AWS Secrets Manager...');

  let dbConfig = {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    name: env.db.name,
    ssl: buildSSLConfig(env.db.ssl) || false,
  };

  let redisConfig = {
    host: env.redis.host,
    port: env.redis.port,
    username: env.redis.username,
    password: env.redis.password,
    tls: env.redis.tls ? {} : undefined,
  };

  let githubTokens = env.githubTokens;

  // Try to get configuration from AWS Secrets Manager if secret names are provided
  try {
    if (process.env.AWS_DB_SECRET_NAME) {
      console.log('Loading database configuration from AWS Secrets Manager...');
      const awsDbConfig = await secretsManager.getDatabaseConfig();
      dbConfig = {
        ...dbConfig,
        ...awsDbConfig,
        ssl: awsDbConfig.ssl,
      };
    }

    if (process.env.AWS_REDIS_SECRET_NAME) {
      console.log('Loading Redis configuration from AWS Secrets Manager...');
      const awsRedisConfig = await secretsManager.getRedisConfig();
      redisConfig = {
        ...redisConfig,
        ...awsRedisConfig,
      };
    }

    if (process.env.AWS_GITHUB_SECRET_NAME) {
      console.log('Loading GitHub tokens from AWS Secrets Manager...');
      const awsGithubTokens = await secretsManager.getGitHubTokens();
      if (awsGithubTokens.length > 0) {
        githubTokens = awsGithubTokens;
      }
    }
  } catch (error) {
    console.warn('Failed to load some configuration from AWS Secrets Manager:', error.message);
    if (env.nodeEnv === 'production') {
      throw error; // Fail fast in production
    }
  }

  const queueCleanupStatuses = env.startup.queueCleanupStatuses.length > 0
    ? env.startup.queueCleanupStatuses
    : ['wait', 'delayed', 'active', 'completed', 'failed', 'stalled'];

  const shouldCleanupQueues = env.startup.queueCleanupMode === 'always'
    || (env.startup.queueCleanupMode === 'nonprod' && env.nodeEnv !== 'production');

  cachedConfig = {
    nodeEnv: env.nodeEnv,
    port: env.port,
    db: dbConfig,
    githubTokens,
    redis: redisConfig,
    rateLimit: {
      windowMs: env.rateLimit.windowMs,
      maxRequests: env.rateLimit.maxRequests,
    },
    scheduler: {
      rankingUpdateLockTtlMs: env.scheduler.rankingUpdateLockTtlMs,
    },
    startup: {
      queueCleanup: {
        enabled: shouldCleanupQueues,
        graceMs: env.startup.queueCleanupGraceMs,
        statuses: queueCleanupStatuses,
      },
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      secretNames: {
        database: process.env.AWS_DB_SECRET_NAME,
        redis: process.env.AWS_REDIS_SECRET_NAME,
        github: process.env.AWS_GITHUB_SECRET_NAME,
        ses: process.env.AWS_SES_SECRET_NAME,
      },
    },
  };

  validateProductionSecrets(cachedConfig);
  isInitialized = true;

  console.log('Configuration initialized successfully');
  return cachedConfig;
}

/**
 * Get configuration (synchronous, requires initialization)
 */
function getConfig() {
  if (!cachedConfig) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return cachedConfig;
}

/**
 * Refresh configuration from AWS Secrets Manager
 */
async function refreshConfig() {
  console.log('Refreshing configuration from AWS Secrets Manager...');
  isInitialized = false;
  cachedConfig = null;
  secretsManager.clearCache(); // Clear secrets cache
  return await initializeConfig();
}

// For backwards compatibility, try to initialize synchronously if no AWS secrets are configured
if (!process.env.AWS_DB_SECRET_NAME && !process.env.AWS_REDIS_SECRET_NAME && !process.env.AWS_GITHUB_SECRET_NAME) {
  const queueCleanupStatuses = env.startup.queueCleanupStatuses.length > 0
    ? env.startup.queueCleanupStatuses
    : ['wait', 'delayed', 'active', 'completed', 'failed', 'stalled'];

  const shouldCleanupQueues = env.startup.queueCleanupMode === 'always'
    || (env.startup.queueCleanupMode === 'nonprod' && env.nodeEnv !== 'production');

  cachedConfig = {
    nodeEnv: env.nodeEnv,
    port: env.port,
    db: {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      name: env.db.name,
      ssl: buildSSLConfig(env.db.ssl) || false,
    },
    githubTokens: env.githubTokens,
    redis: {
      host: env.redis.host,
      port: env.redis.port,
      username: env.redis.username,
      password: env.redis.password,
      tls: env.redis.tls ? {} : undefined,
    },
    rateLimit: {
      windowMs: env.rateLimit.windowMs,
      maxRequests: env.rateLimit.maxRequests,
    },
    scheduler: {
      rankingUpdateLockTtlMs: env.scheduler.rankingUpdateLockTtlMs,
    },
    startup: {
      queueCleanup: {
        enabled: shouldCleanupQueues,
        graceMs: env.startup.queueCleanupGraceMs,
        statuses: queueCleanupStatuses,
      },
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      secretNames: {
        database: null,
        redis: null,
        github: null,
        ses: null,
      },
    },
  };

  validateProductionSecrets(cachedConfig);
  isInitialized = true;
}

module.exports = cachedConfig || {
  initializeConfig,
  getConfig,
  refreshConfig,
};
