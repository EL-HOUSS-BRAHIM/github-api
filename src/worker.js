require('dotenv').config();
const harvesterQueue = require('./queues/harvester');

console.log('Worker process started');

harvesterQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed for ${job.data.username}`);
});

harvesterQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed for ${job.data.username}:`, err);
});