require('dotenv').config();
const fs = require('fs');
const path = require('path');
const env = require('./env');

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

  if (!envConfig.db.password) {
    missingSecrets.push('DB_PASSWORD');
  }

  if (!envConfig.redis.password) {
    missingSecrets.push('REDIS_PASSWORD');
  }

  if (!envConfig.githubTokens.length) {
    missingSecrets.push('GITHUB_TOKENS');
  }

  if (missingSecrets.length > 0) {
    throw new Error(`Missing required production secrets: ${missingSecrets.join(', ')}`);
  }
}

const queueCleanupStatuses = env.startup.queueCleanupStatuses.length > 0
  ? env.startup.queueCleanupStatuses
  : ['wait', 'delayed', 'active', 'completed', 'failed', 'stalled'];

const shouldCleanupQueues = env.startup.queueCleanupMode === 'always'
  || (env.startup.queueCleanupMode === 'nonprod' && env.nodeEnv !== 'production');

const config = {
  nodeEnv: env.nodeEnv,
  port: env.port,
  db: {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    name: env.db.name,
    ssl: buildSSLConfig(env.db.ssl),
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
};

validateProductionSecrets(config);

module.exports = config;
