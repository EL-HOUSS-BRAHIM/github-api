const http = require('http');
const app = require('./app');
const config = require('./config');
const sequelize = require('./config/database');
const redisClient = require('./config/redis');
const harvesterQueue = require('./queues/harvester');

const server = http.createServer(app);

async function startServer() {
  try {
    // Clean up any stalled jobs
    console.log('Cleaning up stalled jobs...');
    try {
      await harvesterQueue.clean(0, 'delayed');
      await harvesterQueue.clean(0, 'wait');
      await harvesterQueue.clean(0, 'active');
      console.log('Queue cleanup completed');
    } catch (queueError) {
      console.warn('Queue cleanup warning:', queueError);
      // Continue startup even if queue cleanup fails
    }
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync models with the database
    await sequelize.sync({ force: false });

    server.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

startServer();

// Handle process termination
process.on('SIGTERM', async () => {
  console.info('SIGTERM signal received.');
  await Promise.all([
    redisClient.quit(),
    sequelize.close(),
    harvesterQueue.close()
  ]);
  process.exit(0);
});