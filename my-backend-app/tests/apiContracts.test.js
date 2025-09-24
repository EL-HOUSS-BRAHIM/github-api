const request = require('supertest');

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};

const mockHarvesterQueue = {
  add: jest.fn(),
  getJobs: jest.fn(),
  getJobCounts: jest.fn(),
  clean: jest.fn(),
  close: jest.fn(),
  getRepeatableJobs: jest.fn(),
  isPaused: jest.fn(),
  getWorkers: jest.fn(),
};

const mockCacheUtils = {
  deleteKeysByPattern: jest.fn(),
};

const mockUserModel = { findOne: jest.fn() };
const mockUserRankingModel = { findOne: jest.fn() };
const mockActivityModel = { sum: jest.fn(), findAll: jest.fn() };
const mockRepositoryModel = {
  count: jest.fn(),
  findAndCountAll: jest.fn(),
};

const mockRankingService = {
  updateUserRanking: jest.fn(),
  updateRankings: jest.fn(),
};

const mockGithubService = {
  searchUsersByLocation: jest.fn(),
  getUserProfile: jest.fn(),
};

const mockRankingSnapshotService = {
  getLatestSnapshot: jest.fn(),
  recordSnapshotForUser: jest.fn(),
  isSnapshotFresh: jest.fn(),
};

jest.mock('../src/scheduler', () => ({}));
jest.mock('../src/config/redis', () => mockRedisClient);
jest.mock('../src/queues/harvester', () => mockHarvesterQueue);
jest.mock('../src/utils/cache', () => mockCacheUtils);
jest.mock('../src/models', () => ({
  User: mockUserModel,
  UserRanking: mockUserRankingModel,
  Activity: mockActivityModel,
  Repository: mockRepositoryModel,
}));
jest.mock('../src/services/ranking', () => mockRankingService);
jest.mock('../src/services/github', () => mockGithubService);
jest.mock('../src/services/rankingSnapshot', () => mockRankingSnapshotService);

const app = require('../src/app');
const redisClient = require('../src/config/redis');
const harvesterQueue = require('../src/queues/harvester');
const cacheUtils = require('../src/utils/cache');
const rankingService = require('../src/services/ranking');
const { User, UserRanking } = require('../src/models');

beforeEach(() => {
  jest.clearAllMocks();

  mockUserModel.findOne.mockReset();
  mockUserRankingModel.findOne.mockReset();
  mockActivityModel.sum.mockReset();
  mockActivityModel.findAll.mockReset();
  mockRepositoryModel.count.mockReset();
  mockRepositoryModel.findAndCountAll.mockReset();

  mockRedisClient.get.mockReset();
  mockRedisClient.set.mockReset();
  mockRedisClient.del.mockReset();
  mockRedisClient.quit.mockReset();
  if (mockRedisClient.scan?.mockReset) {
    mockRedisClient.scan.mockReset();
    mockRedisClient.scan.mockResolvedValue(['0', []]);
  }

  mockHarvesterQueue.add.mockReset();
  mockHarvesterQueue.getJobs.mockReset();
  mockHarvesterQueue.getJobCounts.mockReset();
  mockHarvesterQueue.clean.mockReset();
  mockHarvesterQueue.close.mockReset();
  mockHarvesterQueue.getRepeatableJobs.mockReset();
  mockHarvesterQueue.isPaused.mockReset();
  mockHarvesterQueue.getWorkers.mockReset();

  mockCacheUtils.deleteKeysByPattern.mockReset();
  mockRankingService.updateUserRanking.mockReset();
  mockRankingService.updateRankings.mockReset();
  mockRankingSnapshotService.getLatestSnapshot.mockReset();
  mockRankingSnapshotService.recordSnapshotForUser.mockReset();
  mockRankingSnapshotService.isSnapshotFresh.mockReset();

  mockRedisClient.get.mockResolvedValue(null);
  mockRedisClient.set.mockResolvedValue(null);
  mockRedisClient.del.mockResolvedValue(1);
  mockRedisClient.quit.mockResolvedValue(null);
  mockRedisClient.scan = mockRedisClient.scan || jest.fn().mockResolvedValue(['0', []]);

  mockHarvesterQueue.add.mockResolvedValue(undefined);
  mockHarvesterQueue.getJobs.mockResolvedValue([]);
  mockHarvesterQueue.getJobCounts.mockResolvedValue({
    waiting: 0,
    active: 0,
    delayed: 0,
    completed: 0,
    failed: 0,
  });
  mockHarvesterQueue.clean.mockResolvedValue(undefined);
  mockHarvesterQueue.close.mockResolvedValue(undefined);
  mockHarvesterQueue.getRepeatableJobs.mockResolvedValue([]);
  mockHarvesterQueue.isPaused.mockResolvedValue(false);
  mockHarvesterQueue.getWorkers.mockResolvedValue([]);

  mockCacheUtils.deleteKeysByPattern.mockResolvedValue(0);
  mockRepositoryModel.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  mockRankingSnapshotService.getLatestSnapshot.mockResolvedValue(null);
  mockRankingSnapshotService.recordSnapshotForUser.mockResolvedValue(null);
  mockRankingSnapshotService.isSnapshotFresh.mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Ranking API', () => {
  test('GET /api/ranking/user/:username returns ranking details', async () => {
    const userRecord = { id: 42, username: 'octocat', location: 'San Francisco' };
    const rankingRecord = {
      country: 'United States',
      score: 4120,
      global_rank: 15,
      country_rank: 2,
      total_commits: 1890,
      total_contributions: 2450,
      followers: 875,
      public_repos: 120,
      last_calculated_at: '2024-05-01T12:00:00.000Z',
    };

    User.findOne.mockResolvedValue(userRecord);
    UserRanking.findOne.mockResolvedValue(rankingRecord);

    const response = await request(app).get('/api/ranking/user/octocat');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      username: 'octocat',
      location: 'San Francisco',
      country: 'United States',
      score: 4120,
      globalRank: 15,
      countryRank: 2,
      totalCommits: 1890,
      totalContributions: 2450,
      followers: 875,
      publicRepos: 120,
      lastCalculated: '2024-05-01T12:00:00.000Z',
    });
  });

  test('GET /api/ranking/user/:username returns 404 when ranking is missing', async () => {
    User.findOne.mockResolvedValue({ id: 7, username: 'missing', location: 'Paris' });
    UserRanking.findOne.mockResolvedValue(null);

    const response = await request(app).get('/api/ranking/user/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Ranking not found', status: 404 });
  });

  test('GET /api/ranking/user/:username returns 404 when user is unknown', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).get('/api/ranking/user/ghost');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found', status: 404 });
  });

  test('POST /api/ranking/calculate/:username recalculates ranking', async () => {
    User.findOne.mockResolvedValue({ id: 9, username: 'refetch', location: 'Berlin' });
    mockRankingService.updateUserRanking.mockResolvedValue({
      score: 5150,
      global_rank: 21,
      country_rank: 4,
      total_commits: 2200,
      total_contributions: 3125,
      followers: 430,
      public_repos: 88,
      last_calculated_at: '2024-05-02T08:30:00.000Z',
    });

    const response = await request(app).post('/api/ranking/calculate/refetch');

    expect(response.status).toBe(200);
    expect(mockRankingService.updateUserRanking).toHaveBeenCalledWith(9);
    expect(response.body).toEqual({
      success: true,
      ranking: {
        score: 5150,
        globalRank: 21,
        countryRank: 4,
        totalCommits: 2200,
        totalContributions: 3125,
        followers: 430,
        publicRepos: 88,
        lastCalculated: '2024-05-02T08:30:00.000Z',
      },
    });
  });

  test('POST /api/ranking/calculate/:username returns 404 when user is unknown', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post('/api/ranking/calculate/ghost');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found', status: 404 });
    expect(mockRankingService.updateUserRanking).not.toHaveBeenCalled();
  });
});

describe('User profile API', () => {
  test('GET /api/user/:username returns fresh profile with queue metrics', async () => {
    const now = new Date();
    const payload = {
      username: 'octocat',
      full_name: 'The Octocat',
      is_fetching: false,
      last_fetched: now,
    };

    mockUserModel.findOne.mockResolvedValue({
      ...payload,
      toJSON: () => ({
        username: payload.username,
        full_name: payload.full_name,
        last_fetched: now,
        is_fetching: payload.is_fetching,
      }),
    });

    const response = await request(app).get('/api/user/octocat');

    expect(mockUserModel.findOne).toHaveBeenCalledWith({ where: { username: 'octocat' } });
    expect(mockHarvesterQueue.getJobCounts).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      username: 'octocat',
      full_name: 'The Octocat',
      is_fresh: true,
      refresh_metrics: {
        queued: 0,
        active: 0,
        delayed: 0,
        completed: 0,
        failed: 0,
      },
      ranking_snapshot: null,
    });
    expect(typeof response.body.data_age).toBe('number');
  });

  test('GET /api/user/:username queues refresh for stale data and returns metrics', async () => {
    const staleDate = new Date(Date.now() - (48 * 60 * 60 * 1000));
    const snapshotRecord = {
      recorded_at: new Date('2024-06-01T12:00:00.000Z'),
      followers: 99,
      public_repos: 10,
      job_id: 'harvest-octocat',
    };
    mockUserModel.findOne.mockResolvedValue({
      username: 'octocat',
      full_name: 'The Octocat',
      is_fetching: false,
      last_fetched: staleDate,
      toJSON: () => ({
        username: 'octocat',
        full_name: 'The Octocat',
        is_fetching: false,
        last_fetched: staleDate,
      }),
    });
    mockHarvesterQueue.getJobs.mockResolvedValueOnce([]);
    mockRankingSnapshotService.recordSnapshotForUser.mockResolvedValue(snapshotRecord);

    const response = await request(app).get('/api/user/octocat');

    expect(mockHarvesterQueue.add).toHaveBeenCalledWith(
      { username: 'octocat' },
      expect.objectContaining({ jobId: 'harvest-octocat', removeOnComplete: true })
    );
    expect(mockRankingSnapshotService.recordSnapshotForUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'octocat' }),
      expect.objectContaining({ jobId: 'harvest-octocat' })
    );
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      username: 'octocat',
      is_refreshing: true,
      refresh_queued: true,
      refresh_metrics: expect.objectContaining({
        queued: 1,
      }),
      ranking_snapshot: {
        recordedAt: '2024-06-01T12:00:00.000Z',
        followers: 99,
        publicRepos: 10,
        jobId: 'harvest-octocat',
      },
    });
  });

  test('GET /api/user/:username honors recent snapshot and avoids duplicate queueing', async () => {
    const staleDate = new Date(Date.now() - (48 * 60 * 60 * 1000));
    const snapshotRecord = {
      recorded_at: new Date('2024-06-02T08:00:00.000Z'),
      followers: 120,
      public_repos: 45,
      job_id: 'harvest-octocat',
    };

    mockUserModel.findOne.mockResolvedValue({
      username: 'octocat',
      full_name: 'The Octocat',
      is_fetching: false,
      last_fetched: staleDate,
      followers: 120,
      public_repos: 45,
      toJSON: () => ({
        username: 'octocat',
        full_name: 'The Octocat',
        is_fetching: false,
        last_fetched: staleDate,
        followers: 120,
        public_repos: 45,
      }),
    });

    mockRankingSnapshotService.getLatestSnapshot.mockResolvedValue(snapshotRecord);
    mockRankingSnapshotService.isSnapshotFresh.mockReturnValue(true);
    mockHarvesterQueue.getJobs.mockResolvedValueOnce([]);

    const response = await request(app).get('/api/user/octocat');

    expect(mockHarvesterQueue.add).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      username: 'octocat',
      is_refreshing: true,
      refresh_queued: true,
      refresh_metrics: expect.objectContaining({ queued: 0 }),
      ranking_snapshot: {
        recordedAt: '2024-06-02T08:00:00.000Z',
        followers: 120,
        publicRepos: 45,
        jobId: 'harvest-octocat',
      },
    });
  });

  test('GET /api/user/:username returns 202 for unknown user with queue metrics', async () => {
    mockUserModel.findOne.mockResolvedValue(null);
    mockHarvesterQueue.getJobs.mockResolvedValueOnce([]);

    const response = await request(app).get('/api/user/new-user');

    expect(mockHarvesterQueue.add).toHaveBeenCalledWith(
      { username: 'new-user' },
      expect.objectContaining({ jobId: 'harvest-new-user', removeOnComplete: true })
    );
    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      status: 'pending',
      message: 'User data is being fetched. Please try again in a few moments.',
      retryAfter: 5,
      username: 'new-user',
      refresh_metrics: expect.objectContaining({
        queued: 1,
      }),
      refresh_queued: true,
      ranking_snapshot: null,
    });
  });
});

describe('User refresh API', () => {
  test('POST /api/user/:username/refresh clears cache and queues job', async () => {
    const snapshotRecord = {
      recorded_at: new Date('2024-06-03T10:00:00.000Z'),
      followers: 450,
      public_repos: 80,
      job_id: 'refresh-octocat-123',
    };

    mockUserModel.findOne.mockResolvedValue({
      id: 42,
      username: 'octocat',
      followers: 450,
      public_repos: 80,
    });
    mockHarvesterQueue.getJobCounts.mockResolvedValueOnce({
      waiting: 2,
      active: 1,
      delayed: 0,
      completed: 5,
      failed: 1,
    });
    mockRankingSnapshotService.recordSnapshotForUser.mockResolvedValue(snapshotRecord);

    const response = await request(app).post('/api/user/octocat/refresh');

    expect(mockUserModel.findOne).toHaveBeenCalledWith({ where: { username: 'octocat' } });
    expect(response.status).toBe(202);
    expect(redisClient.del).toHaveBeenCalledWith('user:octocat:profile');
    expect(cacheUtils.deleteKeysByPattern).toHaveBeenCalledWith('user:octocat:repos:*');
    expect(harvesterQueue.getJobCounts).toHaveBeenCalledTimes(1);
    expect(harvesterQueue.add).toHaveBeenCalledWith(
      'refresh-user',
      { username: 'octocat' },
      expect.objectContaining({
        attempts: 3,
        removeOnComplete: true,
        jobId: expect.stringMatching(/^refresh-octocat-/),
      })
    );
    expect(mockRankingSnapshotService.recordSnapshotForUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'octocat', followers: 450, public_repos: 80 }),
      expect.objectContaining({ jobId: expect.stringMatching(/^refresh-octocat-/) })
    );
    expect(response.body).toMatchObject({
      status: 'refreshing',
      message: 'User refresh job queued successfully',
      username: 'octocat',
      retryAfter: 5,
      refresh_metrics: {
        queued: 3,
        active: 1,
        delayed: 0,
        completed: 5,
        failed: 1,
      },
      refresh_queued: true,
      ranking_snapshot: expect.objectContaining({
        recordedAt: '2024-06-03T10:00:00.000Z',
        followers: 450,
        publicRepos: 80,
        jobId: 'refresh-octocat-123',
      }),
    });
  });
});

describe('System health API', () => {
  test('GET /api/system/health returns queue summary', async () => {
    const repeatableJobs = [
      { id: 'job1', name: 'daily-refresh', cron: '0 * * * *', next: '2024-06-04T00:00:00.000Z' },
    ];

    mockHarvesterQueue.getJobCounts.mockResolvedValueOnce({
      waiting: 3,
      active: 1,
      delayed: 2,
      completed: 10,
      failed: 1,
    });
    mockHarvesterQueue.getRepeatableJobs.mockResolvedValueOnce(repeatableJobs);
    mockHarvesterQueue.isPaused.mockResolvedValueOnce(false);
    mockHarvesterQueue.getWorkers.mockResolvedValueOnce([
      { id: 'worker-1', status: 'ready' },
    ]);

    const response = await request(app).get('/api/system/health');

    expect(mockHarvesterQueue.getJobCounts).toHaveBeenCalledTimes(1);
    expect(mockHarvesterQueue.getRepeatableJobs).toHaveBeenCalledTimes(1);
    expect(mockHarvesterQueue.isPaused).toHaveBeenCalledTimes(1);
    expect(mockHarvesterQueue.getWorkers).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      queue: {
        counts: {
          queued: 3,
          active: 1,
          delayed: 2,
          completed: 10,
          failed: 1,
        },
        isPaused: false,
        repeatable: [
          {
            id: 'job1',
            name: 'daily-refresh',
            pattern: '0 * * * *',
            nextRunAt: '2024-06-04T00:00:00.000Z',
          },
        ],
      },
      workers: {
        total: 1,
        isHealthy: true,
        items: [
          {
            id: 'worker-1',
            address: null,
            status: 'ready',
          },
        ],
      },
    });
  });
});

describe('User repositories API', () => {
  test('GET /api/user/:username/repos returns paginated repositories', async () => {
    User.findOne.mockResolvedValue({ id: 11, username: 'octocat' });
    mockRepositoryModel.findAndCountAll.mockResolvedValue({
      count: 3,
      rows: [
        {
          toJSON: () => ({
            name: 'awesome-lib',
            description: 'Useful helpers',
            stars: 50,
            forks: 10,
            issues: 2,
            last_commit: '2024-04-10T00:00:00.000Z',
            commit_count: 120,
            pull_request_count: 30,
            topics: ['javascript', 'tooling'],
            primary_language: 'JavaScript',
            license: 'MIT',
            size: 2048,
            watchers: 75,
            homepage: 'https://example.dev',
            default_branch: 'main',
            source_created_at: '2022-01-02T10:00:00.000Z',
            source_updated_at: '2024-04-09T09:30:00.000Z',
          }),
        },
        {
          toJSON: () => ({
            name: 'side-project',
            description: null,
            stars: 5,
            forks: 1,
            issues: 0,
            last_commit: null,
            commit_count: 12,
            pull_request_count: 0,
            topics: undefined,
            primary_language: null,
            license: null,
            size: null,
            watchers: null,
            homepage: null,
            default_branch: null,
            source_created_at: null,
            source_updated_at: null,
          }),
        },
      ],
    });

    const response = await request(app).get('/api/user/octocat/repos?page=1&per_page=2');

    expect(response.status).toBe(200);
    expect(User.findOne).toHaveBeenCalledWith({ where: { username: 'octocat' }, attributes: ['id'] });
    expect(mockRepositoryModel.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 11 },
        limit: 2,
        offset: 0,
        order: [
          ['stars', 'DESC'],
          ['name', 'ASC'],
        ],
      })
    );
    expect(response.body).toEqual({
      total_count: 3,
      page: 1,
      per_page: 2,
      repos: [
        {
          name: 'awesome-lib',
          description: 'Useful helpers',
          stars: 50,
          forks: 10,
          issues: 2,
          last_commit: '2024-04-10T00:00:00.000Z',
          commit_count: 120,
          pull_request_count: 30,
          topics: ['javascript', 'tooling'],
          language: 'JavaScript',
          license: 'MIT',
          size: 2048,
          watchers: 75,
          homepage: 'https://example.dev',
          default_branch: 'main',
          created_at: '2022-01-02T10:00:00.000Z',
          updated_at: '2024-04-09T09:30:00.000Z',
        },
        {
          name: 'side-project',
          description: null,
          stars: 5,
          forks: 1,
          issues: 0,
          last_commit: null,
          commit_count: 12,
          pull_request_count: 0,
          topics: [],
          language: null,
          license: null,
          size: null,
          watchers: null,
          homepage: null,
          default_branch: null,
          created_at: null,
          updated_at: null,
        },
      ],
    });
    expect(redisClient.set).toHaveBeenCalledWith(
      'user:octocat:repos:1:2',
      JSON.stringify(response.body),
      'EX',
      3600,
    );
  });

  test('GET /api/user/:username/repos returns cached payload when available', async () => {
    const cached = {
      total_count: 0,
      page: 1,
      per_page: 10,
      repos: [],
    };
    redisClient.get.mockResolvedValueOnce(JSON.stringify(cached));

    const response = await request(app).get('/api/user/octocat/repos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(cached);
    expect(User.findOne).not.toHaveBeenCalled();
    expect(mockRepositoryModel.findAndCountAll).not.toHaveBeenCalled();
  });

  test('GET /api/user/:username/repos validates pagination input', async () => {
    const response = await request(app).get('/api/user/octocat/repos?page=0&per_page=500');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid pagination parameters', status: 400 });
    expect(redisClient.get).not.toHaveBeenCalled();
  });

  test('GET /api/user/:username/repos returns 404 when user is unknown', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).get('/api/user/octocat/repos?page=1&per_page=5');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found', status: 404 });
    expect(mockRepositoryModel.findAndCountAll).not.toHaveBeenCalled();
  });
});

describe('User activity API', () => {
  test('GET /api/user/:username/activity returns aggregated metrics', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-05T10:00:00.000Z'));

    User.findOne.mockResolvedValue({
      username: 'octocat',
      Activities: [
        { date: '2024-05-04', commits: 2, pull_requests: 1, issues_opened: 0 },
        { date: '2024-05-03', commits: 0, pull_requests: 0, issues_opened: 1 },
        { date: '2024-05-01', commits: 5, pull_requests: 0, issues_opened: 0 },
      ],
    });

    const response = await request(app).get('/api/user/octocat/activity');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      username: 'octocat',
      totals: {
        commits: 7,
        pullRequests: 1,
        issuesOpened: 1,
      },
      totalContributions: 9,
      daysTracked: 3,
      activeDays: 3,
      averages: {
        perDay: 3,
        perActiveDay: 3,
      },
      currentStreak: 2,
      longestStreak: 2,
      lastActivityDate: '2024-05-04',
    });

    expect(response.body.dailyActivity).toEqual([
      { date: '2024-05-04', commits: 2, pullRequests: 1, issuesOpened: 0, total: 3 },
      { date: '2024-05-03', commits: 0, pullRequests: 0, issuesOpened: 1, total: 1 },
      { date: '2024-05-01', commits: 5, pullRequests: 0, issuesOpened: 0, total: 5 },
    ]);
  });
});
