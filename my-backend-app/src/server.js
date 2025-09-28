const http = require('http');
const app = require('./app');
const config = require('./config');
const sequelize = require('./config/database');
const redisClient = require('./config/redis');
const harvesterQueue = require('./queues/harvester');
const { runPendingMigrations } = require('./database/runMigrations');
const sesService = require('./services/aws/ses');

const server = http.createServer(app);

async function initializeServices() {
  console.log('Initializing services...');
  
  // Initialize configuration (loads AWS Secrets Manager if configured)
  let currentConfig = config;
  if (typeof config.initializeConfig === 'function') {
    console.log('Loading configuration from AWS Secrets Manager...');
    currentConfig = await config.initializeConfig();
  }

  // Initialize SES service if email notifications are enabled
  if (currentConfig.notifications?.enabled) {
    try {
      await sesService.initialize();
      console.log('SES service initialized for email notifications');
    } catch (error) {
      console.warn('Failed to initialize SES service:', error.message);
    }
  }

  return currentConfig;
}

async function testConnections(currentConfig) {
  console.log('Testing service connectivity...');
  
  // Test database connection
  console.log('Testing database connectivity...');
  await sequelize.authenticate();
  console.log('Database connection established successfully.');

  // Test Redis connection
  console.log('Testing Redis connectivity...');
  const redis = typeof redisClient.getRedisClient === 'function' 
    ? await redisClient.getRedisClient() 
    : redisClient;
  
  await redis.ping();
  console.log('Redis connection established successfully.');

  // Test SES if configured
  if (currentConfig.notifications?.enabled) {
    try {
      const sesStatus = sesService.getStatus();
      console.log('SES service status:', sesStatus);
    } catch (error) {
      console.warn('SES service check failed:', error.message);
    }
  }
}

async function startServer() {
  try {
    // Initialize all services and configurations
    const currentConfig = await initializeServices();
    
    // Test all connections
    await testConnections(currentConfig);

    // Run database migrations
    console.log('Running database migrations...');
    await runPendingMigrations();
    console.log('Database migrations completed successfully.');

    // Prepare harvester queue
    console.log('Preparing harvester queue...');
    try {
      if (typeof harvesterQueue.isReady === 'function') {
        await harvesterQueue.isReady();
      }

      if (currentConfig.startup.queueCleanup.enabled) {
        const cleanupStatuses = currentConfig.startup.queueCleanup.statuses;
        const grace = currentConfig.startup.queueCleanup.graceMs;
        await Promise.all(cleanupStatuses.map(async (status) => {
          try {
            await harvesterQueue.clean(grace, status);
          } catch (cleanupError) {
            console.warn(`Queue cleanup warning for status "${status}":`, cleanupError);
          }
        }));
      } else {
        console.log('Startup queue cleanup skipped (disabled by configuration).');
      }

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

    // Start HTTP server
    const port = currentConfig.port || config.port || 3000;
    server.listen(port, () => {
      console.log(`🚀 GitHub API server listening on port ${port}`);
      console.log(`   Environment: ${currentConfig.nodeEnv}`);
      console.log(`   Database: ${currentConfig.db.host}:${currentConfig.db.port}`);
      console.log(`   Redis: ${currentConfig.redis.host}:${currentConfig.redis.port}`);
      console.log(`   AWS Region: ${currentConfig.aws?.region || 'Not configured'}`);
      console.log(`   Email Notifications: ${currentConfig.notifications?.enabled ? 'Enabled' : 'Disabled'}`);
    });

    // Send startup notification if enabled
    if (currentConfig.notifications?.enabled && currentConfig.notifications?.email) {
      try {
        await sesService.sendInfoNotification({
          to: currentConfig.notifications.email,
          title: 'GitHub API Service Started',
          message: `The GitHub API service has started successfully on port ${port}`,
          metadata: {
            environment: currentConfig.nodeEnv,
            port: port,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.warn('Failed to send startup notification:', error.message);
      }
    }

  } catch (error) {
    console.error('Unable to start the server:', error);
    
    // Send error notification if possible
    try {
      const currentConfig = typeof config.getConfig === 'function' ? config.getConfig() : config;
      if (currentConfig.notifications?.enabled && currentConfig.notifications?.email) {
        await sesService.sendErrorNotification({
          to: currentConfig.notifications.email,
          title: 'GitHub API Service Startup Failed',
          message: `Failed to start the GitHub API service: ${error.message}`,
          metadata: {
            error: error.stack,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (notificationError) {
      console.warn('Failed to send error notification:', notificationError.message);
    }
    
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.info(`${signal} signal received. Starting graceful shutdown...`);
  
  try {
    // Send shutdown notification if configured
    const currentConfig = typeof config.getConfig === 'function' ? config.getConfig() : config;
    if (currentConfig.notifications?.enabled && currentConfig.notifications?.email) {
      try {
        await sesService.sendWarningNotification({
          to: currentConfig.notifications.email,
          title: 'GitHub API Service Shutting Down',
          message: `The GitHub API service is shutting down due to ${signal} signal`,
          metadata: {
            signal,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.warn('Failed to send shutdown notification:', error.message);
      }
    }

    // Close connections
    const redis = typeof redisClient.closeRedisClient === 'function' 
      ? await redisClient.closeRedisClient() 
      : await redisClient.quit();
    
    await Promise.all([
      sequelize.close(),
      harvesterQueue.close()
    ]);

    console.info('Graceful shutdown completed.');
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
  
  process.exit(0);
}

// Start the server
startServer();

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));