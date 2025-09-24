const harvesterQueue = require('../queues/harvester');
const { APIError } = require('../utils/errors');
const { normalizeQueueMetrics } = require('../utils/queue');

function serializeRepeatableJob(job) {
  if (!job || typeof job !== 'object') {
    return null;
  }

  const nextRun = job.next
    || job.nextDate
    || job.nextExecution;

  let nextRunIso = null;
  if (nextRun) {
    const nextDate = nextRun instanceof Date ? nextRun : new Date(nextRun);
    if (!Number.isNaN(nextDate.getTime())) {
      nextRunIso = nextDate.toISOString();
    }
  }

  return {
    id: job.id || job.key || job.name || null,
    name: job.name || null,
    pattern: job.cron || job.pattern || null,
    nextRunAt: nextRunIso,
  };
}

async function getQueueHealth(req, res, next) {
  try {
    const [counts, repeatableJobs] = await Promise.all([
      harvesterQueue.getJobCounts(),
      harvesterQueue.getRepeatableJobs().catch((error) => {
        console.warn('Unable to fetch repeatable jobs:', error);
        return [];
      }),
    ]);

    let isPaused = false;
    try {
      isPaused = await harvesterQueue.isPaused();
    } catch (pauseError) {
      console.warn('Unable to determine queue paused state:', pauseError);
      isPaused = false;
    }

    let workers = [];
    try {
      if (typeof harvesterQueue.getWorkers === 'function') {
        const rawWorkers = await harvesterQueue.getWorkers();
        if (Array.isArray(rawWorkers)) {
          workers = rawWorkers.map((worker) => {
            if (!worker) {
              return null;
            }

            if (typeof worker === 'string') {
              return { id: worker };
            }

            return {
              id: worker.id || worker.name || null,
              address: worker.addr || worker.address || null,
              status: worker.status || null,
            };
          }).filter(Boolean);
        }
      }
    } catch (workerError) {
      console.warn('Unable to fetch queue workers:', workerError);
      workers = [];
    }

    const repeatableSummary = repeatableJobs
      .map(serializeRepeatableJob)
      .filter(Boolean);

    return res.json({
      status: 'ok',
      queue: {
        counts: normalizeQueueMetrics(counts),
        isPaused: Boolean(isPaused),
        repeatable: repeatableSummary,
      },
      workers: {
        total: workers.length,
        isHealthy: workers.length > 0 && !isPaused,
        items: workers,
      },
    });
  } catch (error) {
    console.error('Queue health inspection failed:', error);
    return next(new APIError(503, 'Queue health is currently unavailable'));
  }
}

module.exports = {
  getQueueHealth,
};
