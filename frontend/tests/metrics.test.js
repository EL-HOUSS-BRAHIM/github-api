import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QUEUE_METRICS,
  normalizeQueueMetrics,
  calculateActivityMetrics,
  formatRepoDate,
  formatRepoSize,
} from '../src/utils/metrics.js';

test('normalizeQueueMetrics returns defaults when input is empty', () => {
  const result = normalizeQueueMetrics();
  assert.deepEqual(result, DEFAULT_QUEUE_METRICS);
});

test('normalizeQueueMetrics coerces numeric fields safely', () => {
  const result = normalizeQueueMetrics({ queued: 3, active: '2', failed: null });
  assert.equal(result.queued, 3);
  assert.equal(result.active, DEFAULT_QUEUE_METRICS.active);
  assert.equal(result.failed, DEFAULT_QUEUE_METRICS.failed);
});

test('calculateActivityMetrics aggregates totals and streak inputs', () => {
  const metrics = calculateActivityMetrics({
    totals: { commits: 4, pullRequests: 2, issuesOpened: 1 },
    totalContributions: 7,
    dailyActivity: [
      { date: '2024-05-05', commits: 2, pull_requests: 1, issues_opened: 0 },
      { date: '2024-05-04', commits: 0, pull_requests: 0, issues_opened: 1 },
    ],
  });

  assert.equal(metrics.totalContributions, 7);
  assert.equal(metrics.totals.commits, 4);
  assert.equal(metrics.dailyActivity.length, 2);
  assert.equal(metrics.dailyActivity[0].total, 3);
  assert.equal(metrics.averages.perDay, 3.5);
});

test('formatRepoDate falls back to Unknown on invalid input', () => {
  assert.equal(formatRepoDate(null), 'Unknown');
  assert.equal(formatRepoDate('not-a-date'), 'Unknown');
});

test('formatRepoSize formats positive values and guards invalid numbers', () => {
  assert.match(formatRepoSize(2048), /2.?048 KB/);
  assert.equal(formatRepoSize(-10), 'Unknown size');
});
