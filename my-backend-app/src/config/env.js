const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(0).max(65535).default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().optional().default(''),
  DB_NAME: z.string().min(1).default('github_insights'),
  DB_SSL_CA_PATH: z.string().optional().default(''),
  DB_SSL_REJECT_UNAUTHORIZED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  GITHUB_TOKENS: z.string().optional().default(''),
  REDIS_HOST: z.string().min(1).default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().min(0).max(65535).default(6379),
  REDIS_USERNAME: z.string().optional().default(''),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_TLS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  QUEUE_CLEANUP_MODE: z
    .enum(['always', 'nonprod', 'never'])
    .default('nonprod'),
  QUEUE_CLEANUP_STATUSES: z.string().optional().default(''),
  QUEUE_CLEANUP_GRACE_MS: z.coerce.number().int().nonnegative().default(600000),
  RANKING_LOCK_TTL_MS: z.coerce.number().int().positive().default(3600000),
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
  };
}

module.exports = parseEnv(process.env);
