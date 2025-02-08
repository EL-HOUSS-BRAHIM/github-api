// src/worker.js
require('dotenv').config();
const harvesterQueue = require('./queues/harvester');

console.log('Worker process started');

// Monitor queue events
harvesterQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed for ${result.username}`);
});

harvesterQueue.on('failed', (job, error) => {
  console.error(`❌ Job ${job.id} failed for ${job.data.username}:`, error);
});

harvesterQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await harvesterQueue.close();
  process.exit(0);
});