// src/scheduler.js
const cron = require('node-cron');
const rankingService = require('./services/ranking');
const config = require('./config');
const redisClient = require('./config/redis');
const { runWithDistributedLock } = require('./utils/distributedLock');

const rankingUpdateLockKey = 'locks:ranking:update';

cron.schedule('0 0 * * *', async () => {
  try {
    const executed = await runWithDistributedLock(
      redisClient,
      rankingUpdateLockKey,
      config.scheduler.rankingUpdateLockTtlMs,
      async () => {
        console.log('Updating user rankings...');
        await rankingService.updateRankings();
        console.log('User rankings updated');
      }
    );

    if (!executed) {
      console.log('Skipping ranking update because another instance holds the scheduler lock.');
    }
  } catch (error) {
    console.error('Scheduled ranking update failed:', error);
  }
});