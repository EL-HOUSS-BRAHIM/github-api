require('dotenv').config();
const fs = require('fs');
const path = require('path');
const env = require('../src/config/env');

function resolveSSL() {
  if (!env.db.ssl?.caPath) {
    return undefined;
  }

  const resolvedPath = path.resolve(env.db.ssl.caPath);

  if (!fs.existsSync(resolvedPath)) {
    console.warn(`Database CA file not found at ${resolvedPath}. Continuing without SSL CA.`);
    return undefined;
  }

  try {
    return {
      ca: fs.readFileSync(resolvedPath, 'utf8'),
      rejectUnauthorized: env.db.ssl.rejectUnauthorized,
    };
  } catch (error) {
    console.warn('Failed to read database CA file for CLI usage. Continuing without SSL CA.', error.message);
    return undefined;
  }
}

function buildConfig(overrides = {}) {
  return {
    username: env.db.user,
    password: env.db.password || null,
    database: overrides.database || env.db.name,
    host: env.db.host,
    port: env.db.port,
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00',
    dialectOptions: {
      ssl: resolveSSL(),
      dateStrings: true,
      typeCast: true,
      flags: '-DATE_INVALID_DATES',
    },
    ...overrides,
  };
}

module.exports = {
  development: buildConfig(),
  test: buildConfig({ database: process.env.DB_NAME || env.db.name }),
  production: buildConfig(),
};
