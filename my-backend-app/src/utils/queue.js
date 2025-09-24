const DEFAULT_QUEUE_METRICS = {
  queued: 0,
  active: 0,
  delayed: 0,
  completed: 0,
  failed: 0,
};

function normalizeQueueMetrics(counts) {
  if (!counts || typeof counts !== 'object') {
    return { ...DEFAULT_QUEUE_METRICS };
  }

  return {
    queued: typeof counts.waiting === 'number' ? counts.waiting : DEFAULT_QUEUE_METRICS.queued,
    active: typeof counts.active === 'number' ? counts.active : DEFAULT_QUEUE_METRICS.active,
    delayed: typeof counts.delayed === 'number' ? counts.delayed : DEFAULT_QUEUE_METRICS.delayed,
    completed: typeof counts.completed === 'number' ? counts.completed : DEFAULT_QUEUE_METRICS.completed,
    failed: typeof counts.failed === 'number' ? counts.failed : DEFAULT_QUEUE_METRICS.failed,
  };
}

module.exports = {
  DEFAULT_QUEUE_METRICS,
  normalizeQueueMetrics,
};
