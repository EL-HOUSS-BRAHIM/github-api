import { describe, it, expect } from 'vitest';
import {
  DEFAULT_QUEUE_METRICS,
  normalizeQueueMetrics,
  calculateActivityMetrics,
  formatRepoDate,
  formatRepoSize,
} from '../src/utils/metrics.js';

describe('metrics utilities', () => {
  it('normalizeQueueMetrics returns defaults when input is empty', () => {
    const result = normalizeQueueMetrics();
    expect(result).toEqual(DEFAULT_QUEUE_METRICS);
  });

  it('normalizeQueueMetrics coerces numeric fields safely', () => {
    const result = normalizeQueueMetrics({ queued: 3, active: '2', failed: null });
    expect(result.queued).toBe(3);
    expect(result.active).toBe(DEFAULT_QUEUE_METRICS.active);
    expect(result.failed).toBe(DEFAULT_QUEUE_METRICS.failed);
  });

  it('calculateActivityMetrics aggregates totals and streak inputs', () => {
    const metrics = calculateActivityMetrics({
      totals: { commits: 4, pullRequests: 2, issuesOpened: 1 },
      totalContributions: 7,
      dailyActivity: [
        { date: '2024-05-05', commits: 2, pull_requests: 1, issues_opened: 0 },
        { date: '2024-05-04', commits: 0, pull_requests: 0, issues_opened: 1 },
      ],
    });

    expect(metrics.totalContributions).toBe(7);
    expect(metrics.totals.commits).toBe(4);
    expect(metrics.dailyActivity).toHaveLength(2);
    expect(metrics.dailyActivity[0].total).toBe(3);
    expect(metrics.averages.perDay).toBe(3.5);
  });

  it('formatRepoDate falls back to Unknown on invalid input', () => {
    expect(formatRepoDate(null)).toBe('Unknown');
    expect(formatRepoDate('not-a-date')).toBe('Unknown');
  });

  it('formatRepoSize formats positive values and guards invalid numbers', () => {
    expect(formatRepoSize(2048)).toMatch(/2.?048 KB/);
    expect(formatRepoSize(-10)).toBe('Unknown size');
  });
});
