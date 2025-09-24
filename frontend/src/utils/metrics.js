export const DEFAULT_QUEUE_METRICS = {
  queued: 0,
  active: 0,
  delayed: 0,
  completed: 0,
  failed: 0,
};

export function normalizeQueueMetrics(metrics) {
  const base = { ...DEFAULT_QUEUE_METRICS };
  if (!metrics || typeof metrics !== 'object') {
    return base;
  }

  return {
    queued: Number.isFinite(metrics.queued) ? metrics.queued : base.queued,
    active: Number.isFinite(metrics.active) ? metrics.active : base.active,
    delayed: Number.isFinite(metrics.delayed) ? metrics.delayed : base.delayed,
    completed: Number.isFinite(metrics.completed) ? metrics.completed : base.completed,
    failed: Number.isFinite(metrics.failed) ? metrics.failed : base.failed,
  };
}

export function formatRepoDate(value) {
  if (!value) {
    return 'Unknown';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRepoSize(size) {
  if (typeof size !== 'number' || size <= 0) {
    return 'Unknown size';
  }

  return `${size.toLocaleString()} KB`;
}

export function calculateActivityMetrics(data = {}) {
  const dailyActivity = Array.isArray(data.dailyActivity) ? data.dailyActivity : [];

  const totals = {
    commits: data.totals?.commits ?? 0,
    pullRequests: data.totals?.pullRequests ?? 0,
    issuesOpened: data.totals?.issuesOpened ?? 0,
  };

  const totalContributions = data.totalContributions ?? 0;
  const daysTracked = data.daysTracked ?? dailyActivity.length;

  const computeTotal = (entry) => {
    if (typeof entry?.total === 'number') {
      return entry.total;
    }

    return (entry?.commits ?? 0)
      + (entry?.pullRequests ?? entry?.pull_requests ?? 0)
      + (entry?.issuesOpened ?? entry?.issues_opened ?? 0);
  };

  const activeDays = data.activeDays ?? dailyActivity.filter((entry) => computeTotal(entry) > 0).length;

  const averages = {
    perDay: data.averages?.perDay ?? (daysTracked ? totalContributions / daysTracked : 0),
    perActiveDay: data.averages?.perActiveDay ?? (activeDays ? totalContributions / activeDays : 0),
  };

  const normalizedActivity = dailyActivity.map((entry) => ({
    date: entry.date,
    commits: entry.commits ?? 0,
    pullRequests: entry.pullRequests ?? entry.pull_requests ?? 0,
    issuesOpened: entry.issuesOpened ?? entry.issues_opened ?? 0,
    total: computeTotal(entry),
  }));

  return {
    totalContributions,
    totals,
    currentStreak: data.currentStreak ?? 0,
    longestStreak: data.longestStreak ?? 0,
    lastActivityDate: data.lastActivityDate ?? null,
    daysTracked,
    activeDays,
    averages,
    dailyActivity: normalizedActivity,
  };
}
