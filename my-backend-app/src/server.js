const http = require('http');
const app = require('./app');
const config = require('./config');
const sequelize = require('./config/database');
const redisClient = require('./config/redis');
const harvesterQueue = require('./queues/harvester');

const server = http.createServer(app);

async function startServer() {
  try {
    console.log('Preparing harvester queue...');
    try {
      if (typeof harvesterQueue.isReady === 'function') {
        await harvesterQueue.isReady();
      }

      const cleanupStatuses = ['wait', 'delayed', 'active', 'completed', 'failed', 'stalled'];
      await Promise.all(cleanupStatuses.map(async (status) => {
        try {
          await harvesterQueue.clean(0, status);
        } catch (cleanupError) {
          console.warn(`Queue cleanup warning for status "${status}":`, cleanupError);
        }
      }));

      let repeatableJobs = [];
      try {
        repeatableJobs = await harvesterQueue.getRepeatableJobs();
      } catch (repeatableError) {
        console.warn('Unable to fetch repeatable job metrics during startup:', repeatableError);
      }

      console.log(`Queue ready. Repeatable jobs tracked: ${repeatableJobs.length}`);
    } catch (queueError) {
      console.warn('Queue preparation warning:', queueError);
      // Continue startup even if queue prep fails
    }

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync models with alter option to safely update tables
    await sequelize.sync({ alter: true });

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