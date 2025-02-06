require('dotenv').config();
const fs = require('fs');

module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: {
      ca: fs.readFileSync(process.env.DB_SSL_CA_PATH), // Read the CA certificate
      rejectUnauthorized: true, // Ensure SSL is required
    },
  },
  githubTokens: process.env.GITHUB_TOKENS.split(','), // Split the tokens into an array
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD, // If your Redis instance has a password
  },
};