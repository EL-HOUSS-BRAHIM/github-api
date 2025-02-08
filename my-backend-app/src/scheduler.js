// src/scheduler.js
const cron = require('node-cron');
const rankingService = require('./services/ranking');

cron.schedule('0 0 * * *', async () => {
  console.log('Updating user rankings...');
  await rankingService.updateRankings();
  console.log('User rankings updated');
});