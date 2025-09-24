require('dotenv').config();
const fs = require('fs');
const path = require('path');

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

function buildSSLConfig() {
  const ca = readCACertificate(process.env.DB_SSL_CA_PATH);
  if (!ca) {
    return undefined;
  }

  return {
    ca,
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
}

const parsedPort = Number(process.env.DB_PORT) || 3306;
const parsedRedisPort = Number(process.env.REDIS_PORT) || 6379;

const tokensEnv = process.env.GITHUB_TOKENS || '';
const githubTokens = tokensEnv
  .split(',')
  .map(token => token.trim())
  .filter(Boolean);

if (tokensEnv && githubTokens.length === 0) {
  console.warn('GITHUB_TOKENS is defined but no valid tokens were parsed.');
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parsedPort,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'github_insights',
    ssl: buildSSLConfig(),
  },
  githubTokens,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parsedRedisPort,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  },
};