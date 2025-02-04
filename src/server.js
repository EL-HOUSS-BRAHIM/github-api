const http = require('http');
const app = require('./app');
const config = require('./config');
const sequelize = require('./config/database');
const redisClient = require('./config/redis');

const server = http.createServer(app);

async function startServer() {
  try {
    // Clean up any stalled jobs
    await harvesterQueue.clean(0, 'delayed');
    await harvesterQueue.clean(0, 'wait');
    await harvesterQueue.clean(0, 'active');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync models with the database
    await sequelize.sync({ force: false });

    // No need to manually connect Redis here since ioredis handles connection automatically

    server.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1); // Exit on critical errors
  }
}

startServer();

// Handle process termination
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  redisClient.quit();
  sequelize.close();
});