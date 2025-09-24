const { User, Repository, Activity } = require('../models');
const harvesterQueue = require('../queues/harvester');
const reportService = require('../services/report');
const { validateUsername, validatePagination } = require('../utils/validation');
const { APIError } = require('../utils/errors');
const redisClient = require('../config/redis');
const { deleteKeysByPattern } = require('../utils/cache');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_QUEUE_METRICS = {
  queued: 0,
  active: 0,
  delayed: 0,
  completed: 0,
  failed: 0,
};

function toUtcDayMs(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function normalizeActivityRecord(activity) {
  const date = activity.date instanceof Date
    ? activity.date.toISOString().split('T')[0]
    : activity.date;

  const commits = activity.commits || 0;
  const pullRequests = activity.pull_requests || activity.pullRequests || 0;
  const issuesOpened = activity.issues_opened || activity.issuesOpened || 0;

  return {
    date,
    commits,
    pullRequests,
    issuesOpened,
    total: commits + pullRequests + issuesOpened,
  };
}

function calculateStreaks(dailyActivity) {
  const contributions = dailyActivity
    .filter(day => day.total > 0)
    .map(day => toUtcDayMs(day.date))
    .sort((a, b) => a - b);

  if (contributions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longest = 1;
  let streak = 1;

  for (let i = 1; i < contributions.length; i += 1) {
    const diffDays = Math.round((contributions[i] - contributions[i - 1]) / DAY_IN_MS);
    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1;
    }

    if (streak > longest) {
      longest = streak;
    }
  }

  const today = toUtcDayMs(new Date());
  const mostRecent = contributions[contributions.length - 1];
  const diffFromToday = Math.round((today - mostRecent) / DAY_IN_MS);

  let currentStreak = 0;
  if (diffFromToday <= 1) {
    currentStreak = 1;
    let index = contributions.length - 1;

    while (index > 0) {
      const gap = Math.round((contributions[index] - contributions[index - 1]) / DAY_IN_MS);
      if (gap === 1) {
        currentStreak += 1;
        index -= 1;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak: Math.max(longest, currentStreak) };
}

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

/**
 * @description Get user profile
 * @route GET /api/user/:username
 */
async function getUserProfile(req, res, next) {
  const { username } = req.params;
  const FETCH_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  try {
    // Find user in database
    const user = await User.findOne({ where: { username } });

    let refreshMetrics = { ...DEFAULT_QUEUE_METRICS };
    try {
      const queueCounts = await harvesterQueue.getJobCounts();
      refreshMetrics = normalizeQueueMetrics(queueCounts);
    } catch (metricsError) {
      console.error('Failed to retrieve queue metrics:', metricsError);
    }

    // Check if user exists and data is fresh
    if (user && !user.is_fetching) {
      // Convert last_fetched to Date object if it isn't already
      const lastFetchedDate = user.last_fetched instanceof Date
        ? user.last_fetched 
        : new Date(user.last_fetched);
      
      const timeSinceLastFetch = Date.now() - lastFetchedDate.getTime();
      
      // Return cached data if fresh
      if (timeSinceLastFetch < FETCH_THRESHOLD) {
        return res.json({
          ...user.toJSON(),
          data_age: timeSinceLastFetch,
          is_fresh: true,
          last_fetched: lastFetchedDate.toISOString(),
          refresh_metrics: refreshMetrics,
        });
      }
    }

    // Queue refresh if data is stale or user not found
    const existingJobs = await harvesterQueue.getJobs(['active', 'waiting']);
    const isQueued = existingJobs.some(job => job.data.username === username);

    if (!isQueued) {
      await harvesterQueue.add({ username }, {
        jobId: `harvest-${username}`,
        removeOnComplete: true
      });
      refreshMetrics = {
        ...refreshMetrics,
        queued: refreshMetrics.queued + 1,
      };
    }

    // Return stale data with refresh status if available
    if (user) {
      return res.json({
        ...user.toJSON(),
        is_fresh: false,
        is_refreshing: true,
        refresh_queued: true,
        refresh_metrics: refreshMetrics,
      });
    }

    return res.status(202).json({
      status: 'pending',
      message: 'User data is being fetched. Please try again in a few moments.',
      retryAfter: 5,
      username,
      refresh_metrics: refreshMetrics,
    });

  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return next(error);
  }
}

/**
 * @description Get user repositories
 * @route GET /api/user/:username/repos
 */
async function getUserRepos(req, res, next) {
  const { username } = req.params;
  const { page = 1, per_page = 10 } = req.query;

  if (!validateUsername(username)) {
    return next(new APIError(400, 'Invalid username format'));
  }

  if (!validatePagination(page, per_page)) {
    return next(new APIError(400, 'Invalid pagination parameters'));
  }

  const pageNumber = parseInt(page, 10);
  const perPageNumber = parseInt(per_page, 10);

  try {
    const cacheKey = `user:${username}:repos:${pageNumber}:${perPageNumber}`;
    const cachedRepos = await redisClient.get(cacheKey);

    if (cachedRepos) {
      return res.json(JSON.parse(cachedRepos));
    }

    const user = await User.findOne({
      where: { username },
      attributes: ['id']
    });

    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    const offset = (pageNumber - 1) * perPageNumber;

    const { count, rows } = await Repository.findAndCountAll({
      where: { user_id: user.id },
      order: [
        ['stars', 'DESC'],
        ['name', 'ASC']
      ],
      limit: perPageNumber,
      offset,
      attributes: [
        'name',
        'description',
        'stars',
        'forks',
        'issues',
        'last_commit',
        'commit_count',
        'pull_request_count',
        'topics',
        'primary_language',
        'license',
        'size',
        'watchers',
        'homepage',
        'default_branch',
        'source_created_at',
        'source_updated_at'
      ]
    });

    const repos = rows.map((repo) => {
      const plain = typeof repo.toJSON === 'function' ? repo.toJSON() : repo;
      return {
        name: plain.name,
        description: plain.description,
        stars: plain.stars,
        forks: plain.forks,
        issues: plain.issues,
        last_commit: plain.last_commit,
        commit_count: plain.commit_count,
        pull_request_count: plain.pull_request_count,
        topics: Array.isArray(plain.topics) ? plain.topics : [],
        language: plain.primary_language || null,
        license: plain.license || null,
        size: typeof plain.size === 'number' ? plain.size : null,
        watchers: typeof plain.watchers === 'number' ? plain.watchers : null,
        homepage: plain.homepage || null,
        default_branch: plain.default_branch || null,
        created_at: plain.source_created_at || null,
        updated_at: plain.source_updated_at || null,
      };
    });

    const response = {
      total_count: count,
      page: pageNumber,
      per_page: perPageNumber,
      repos
    };

    await redisClient.set(cacheKey, JSON.stringify(response), 'EX', 3600);
    return res.json(response);

  } catch (error) {
    console.error('Error fetching repositories:', error);
    return next(error);
  }
}

/**
 * @description Get user activity
 * @route GET /api/user/:username/activity
 */
async function getUserActivity(req, res, next) {
  const { username } = req.params;

  try {
    // Validate username
    if (!validateUsername(username)) {
      throw new APIError(400, 'Invalid username format');
    }

    // Find user and include activities
    const user = await User.findOne({
      where: { username },
      include: [{
        model: Activity,
        attributes: ['date', 'commits', 'pull_requests', 'issues_opened'],
        order: [['date', 'DESC']],
        limit: 365
      }]
    });

    if (!user) {
      throw new APIError(404, 'User not found');
    }

    const dailyActivity = user.Activities
      .map(normalizeActivityRecord)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totals = dailyActivity.reduce((acc, day) => ({
      commits: acc.commits + day.commits,
      pullRequests: acc.pullRequests + day.pullRequests,
      issuesOpened: acc.issuesOpened + day.issuesOpened,
    }), { commits: 0, pullRequests: 0, issuesOpened: 0 });

    const totalContributions = totals.commits + totals.pullRequests + totals.issuesOpened;
    const daysTracked = dailyActivity.length;
    const activeDays = dailyActivity.filter(day => day.total > 0).length;
    const averages = {
      perDay: daysTracked ? totalContributions / daysTracked : 0,
      perActiveDay: activeDays ? totalContributions / activeDays : 0,
    };

    const { currentStreak, longestStreak } = calculateStreaks(dailyActivity);
    const lastActivityDate = dailyActivity.length > 0 ? dailyActivity[0].date : null;

    return res.json({
      username: user.username,
      totals,
      totalContributions,
      currentStreak,
      longestStreak,
      lastActivityDate,
      daysTracked,
      activeDays,
      averages,
      dailyActivity,
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    return next(error);
  }
}

/**
 * @description Get aggregated user report
 * @route GET /api/user/:username/report
 */
async function getUserReport(req, res, next) {
  const { username } = req.params;

  try {
    const user = await User.findOne({
      where: { username },
      include: [
        {
          model: Activity,
          attributes: ['date', 'commits', 'pull_requests', 'issues_opened'],
          order: [['date', 'DESC']],
          limit: 365
        },
        {
          model: Repository,
          attributes: [
            'name',
            'description',
            'stars',
            'forks',
            'issues',
            'last_commit',
            'commit_count',
            'pull_request_count',
            'topics'
          ]
        }
      ]
    });

    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    // Process activities for report
    user.Activities = user.Activities.map(activity => ({
      ...activity.toJSON(),
      date: activity.date instanceof Date ? activity.date.toISOString().split('T')[0] : activity.date
    }));

    // Generate full report
    const report = await reportService.generateReport(user);

    return res.json(report);

  } catch (error) {
    console.error('Error generating user report:', error);
    return next(error);
  }
}

/**
 * @description Refresh user info
 * @route POST /api/user/:username/refresh
 */
async function refreshUserInfo(req, res, next) {
  const { username } = req.params;

  try {
    // Validate username
    if (!validateUsername(username)) {
      throw new APIError(400, 'Invalid username format');
    }

    // Clear cache
    await redisClient.del(`user:${username}:profile`);
    await deleteKeysByPattern(`user:${username}:repos:*`);

    let refreshMetrics = { ...DEFAULT_QUEUE_METRICS };
    try {
      const counts = await harvesterQueue.getJobCounts();
      refreshMetrics = normalizeQueueMetrics(counts);
    } catch (metricsError) {
      console.error('Failed to retrieve queue metrics before queuing refresh:', metricsError);
    }

    // Queue refresh job
    await harvesterQueue.add(
      'refresh-user',
      { username },
      {
        jobId: `refresh-${username}-${Date.now()}`,
        removeOnComplete: true,
        attempts: 3
      }
    );

    refreshMetrics = {
      ...refreshMetrics,
      queued: (refreshMetrics.queued ?? DEFAULT_QUEUE_METRICS.queued) + 1,
    };

    return res.status(202).json({
      status: 'refreshing',
      message: 'User refresh job queued successfully',
      username,
      retryAfter: 5,
      refresh_metrics: refreshMetrics,
      refresh_queued: true,
    });

  } catch (error) {
    console.error('Error refreshing user:', error);
    return next(error);
  }
}

module.exports = {
  getUserProfile,
  getUserRepos,
  getUserActivity,
  getUserReport,
  refreshUserInfo
};