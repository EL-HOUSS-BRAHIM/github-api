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

module.exports = {
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
};
