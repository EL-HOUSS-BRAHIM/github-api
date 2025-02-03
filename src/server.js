const http = require('http');
const app = require('./app');
const config = require('./config');
const sequelize = require('./config/database');
const redisClient = require('./config/redis'); // Import Redis client

const server = http.createServer(app);

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync models with the database (create tables if they don't exist)
    // In production, consider using migrations instead of sync()
    await sequelize.sync({ force: false }); // Use force: true only during development

    // Connect to Redis (if not already connected)
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('Redis client connected');
    }

    server.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
  }
}

startServer();