const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  
  // Database configuration (PostgreSQL)
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(0).max(65535).default(5432), // PostgreSQL default port
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().optional().default(''),
  DB_NAME: z.string().min(1).default('github_insights'),
  DB_SSL_CA_PATH: z.string().optional().default(''),
  DB_SSL_REJECT_UNAUTHORIZED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  
  // GitHub authentication
  GITHUB_TOKENS: z.string().optional().default(''),
  
  // Redis/Valkey configuration
  REDIS_HOST: z.string().min(1).default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().min(0).max(65535).default(6379),
  REDIS_USERNAME: z.string().optional().default(''),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_TLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  
  // AWS configuration
  AWS_REGION: z.string().optional().default('us-east-1'),
  AWS_DB_SECRET_NAME: z.string().optional(),
  AWS_REDIS_SECRET_NAME: z.string().optional(),
  AWS_GITHUB_SECRET_NAME: z.string().optional(),
  AWS_SES_SECRET_NAME: z.string().optional(),
  
  // API configuration
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  
  // Queue configuration
  QUEUE_CLEANUP_MODE: z
    .enum(['always', 'nonprod', 'never'])
    .default('nonprod'),
  QUEUE_CLEANUP_STATUSES: z.string().optional().default(''),
  QUEUE_CLEANUP_GRACE_MS: z.coerce.number().int().nonnegative().default(600000),
  
  // Scheduler configuration
  RANKING_LOCK_TTL_MS: z.coerce.number().int().positive().default(3600000),
  
  // Email notification settings
  NOTIFICATION_EMAIL: z.string().email().optional(),
  ENABLE_EMAIL_NOTIFICATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

function parseEnv(source) {
  let parsed;

  try {
    parsed = envSchema.parse(source);
  } catch (error) {
    console.error('Invalid environment configuration:', error.errors);
    throw error;
  }

  const githubTokens = parsed.GITHUB_TOKENS.split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  if (parsed.GITHUB_TOKENS && githubTokens.length === 0) {
    console.warn('GITHUB_TOKENS is defined but no valid tokens were parsed.');
  }

  const queueCleanupStatuses = parsed.QUEUE_CLEANUP_STATUSES
    ? parsed.QUEUE_CLEANUP_STATUSES.split(',').map((status) => status.trim()).filter(Boolean)
    : [];

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    db: {
      host: parsed.DB_HOST,
      port: parsed.DB_PORT,
      user: parsed.DB_USER,
      password: parsed.DB_PASSWORD,
      name: parsed.DB_NAME,
      ssl: {
        caPath: parsed.DB_SSL_CA_PATH || undefined,
        rejectUnauthorized: parsed.DB_SSL_REJECT_UNAUTHORIZED,
      },
    },
    githubTokens,
    redis: {
      host: parsed.REDIS_HOST,
      port: parsed.REDIS_PORT,
      username: parsed.REDIS_USERNAME || undefined,
      password: parsed.REDIS_PASSWORD || undefined,
      tls: parsed.REDIS_TLS,
    },
    aws: {
      region: parsed.AWS_REGION,
      secretNames: {
        database: parsed.AWS_DB_SECRET_NAME,
        redis: parsed.AWS_REDIS_SECRET_NAME,
        github: parsed.AWS_GITHUB_SECRET_NAME,
        ses: parsed.AWS_SES_SECRET_NAME,
      },
    },
    rateLimit: {
      windowMs: parsed.RATE_LIMIT_WINDOW_MS,
      maxRequests: parsed.RATE_LIMIT_MAX_REQUESTS,
    },
    startup: {
      queueCleanupMode: parsed.QUEUE_CLEANUP_MODE,
      queueCleanupStatuses,
      queueCleanupGraceMs: parsed.QUEUE_CLEANUP_GRACE_MS,
    },
    scheduler: {
      rankingUpdateLockTtlMs: parsed.RANKING_LOCK_TTL_MS,
    },
    notifications: {
      email: parsed.NOTIFICATION_EMAIL,
      enabled: parsed.ENABLE_EMAIL_NOTIFICATIONS,
    },
  };
}

module.exports = parseEnv(process.env);
