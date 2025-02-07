const { User, Repository, Activity } = require('../models');
const harvesterQueue = require('../queues/harvester');
const reportService = require('../services/report');
const { validateUsername, validatePagination } = require('../utils/validation');
const { APIError } = require('../utils/errors');
const redisClient = require('../config/redis');

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
          last_fetched: lastFetchedDate.toISOString()
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
    }

    // Return stale data with refresh status if available
    if (user) {
      return res.json({
        ...user.toJSON(),
        is_fresh: false,
        is_refreshing: true,
        refresh_queued: true
      });
    }

    return res.status(202).json({
      status: 'pending',
      message: 'User data is being fetched. Please try again in a few moments.',
      retryAfter: 5,
      username
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

  try {
    // Cache key includes sort parameters
    const cacheKey = `user:${username}:repos:${page}:${per_page}`;
    const cachedRepos = await redisClient.get(cacheKey);
    
    if (cachedRepos) {
      return res.json(JSON.parse(cachedRepos));
    }

    const user = await User.findOne({
      where: { username },
      include: [{
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
        ],
        order: [
          ['stars', 'DESC'],
          ['name', 'ASC']
        ]
      }]
    });

    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    // Get total count and paginate
    const total = await Repository.count({
      where: { user_id: user.id }
    });

    const offset = (page - 1) * per_page;
    const repos = user.Repositories
      .slice(offset, offset + per_page)
      .map(repo => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stars,
        forks: repo.forks,
        issues: repo.issues,
        last_commit: repo.last_commit,
        commit_count: repo.commit_count,
        pull_request_count: repo.pull_request_count,
        topics: repo.topics || []
      }));

    const response = {
      total_count: total,
      page: parseInt(page),
      per_page: parseInt(per_page),
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

    // Process activities with proper date handling
    const activities = user.Activities.map(activity => ({
      date: activity.date instanceof Date ? activity.date.toISOString().split('T')[0] : activity.date,
      commits: activity.commits || 0,
      pull_requests: activity.pull_requests || 0,
      issues_opened: activity.issues_opened || 0
    }));

    return res.json({
      username: user.username,
      activities: activities
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
          attributes: ['name', 'stars', 'forks', 'issues']
        }
      ]
    });

    if (!user) {
      throw new APIError(404, 'User not found');
    }

    // Process activities with date handling
    user.Activities = user.Activities.map(activity => ({
      ...activity.toJSON(),
      date: activity.date instanceof Date ? activity.date.toISOString().split('T')[0] : activity.date
    }));

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
    await redisClient.del(`user:${username}:repos:*`);
    
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

    return res.status(202).json({
      status: 'refreshing',
      message: 'User refresh job queued successfully',
      username,
      retryAfter: 5
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