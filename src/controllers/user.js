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
  console.log('Fetching profile for username:', username);

  if (!validateUsername(username)) {
    return next(new APIError(400, 'Invalid username format'));
  }

  try {
    // 1. Check Cache
    console.log('Checking Redis cache...');
    const cachedProfile = await redisClient.get(`user:${username}:profile`);
    if (cachedProfile) {
      console.log('Cache hit - returning cached profile');
      return res.json(JSON.parse(cachedProfile));
    }
    console.log('Cache miss');

    // 2. Check Database
    console.log('Checking database...');
    const user = await User.findOne({ where: { username } });
    if (!user) {
      console.log('User not found in database, queueing harvest job');
      // 3. Check if there's already a job in the queue
      const existingJobs = await harvesterQueue.getJobs(['active', 'waiting']);
      const isQueued = existingJobs.some(job => job.data.username === username);

      if (!isQueued) {
        console.log('Adding harvest job to queue');
        await harvesterQueue.add({ username }, {
          jobId: `harvest-${username}`,
          removeOnComplete: true
        });
      }

      return res.status(202).json({
        status: 'pending',
        message: 'User data is being fetched. Please try again in a few moments.',
        retryAfter: 5,
        username
      });
    }

    console.log('User found in database');
    // Format profile response
    const profile = {
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      location: user.location,
      company: user.company,
      website: user.website,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
      social: user.social,
    };

    // Cache the result
    await redisClient.set(`user:${username}:profile`, JSON.stringify(profile), 'EX', 3600);

    return res.json(profile);
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

  try {
    // Check cache
    const cacheKey = `user:${username}:repos:page:${page}:per_page:${per_page}`;
    const cachedRepos = await redisClient.get(cacheKey);
    if (cachedRepos) {
      return res.json(JSON.parse(cachedRepos));
    }

    // Find user
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    // Find repos with pagination
    const { count, rows: repos } = await Repository.findAndCountAll({
      where: { user_id: user.id },
      offset: (page - 1) * per_page,
      limit: per_page,
      order: [['stars', 'DESC']]
    });

    // Format repo data
    const formattedRepos = repos.map(repo => ({
      name: repo.name,
      description: repo.description,
      stars: repo.stars,
      forks: repo.forks,
      issues: repo.issues,
      last_commit: repo.last_commit,
      commit_count: repo.commit_count,
      pull_request_count: repo.pull_request_count,
      topics: repo.topics,
      // ... other fields
    }));

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(formattedRepos), 'EX', 3600); // Cache for 1 hour

    return res.json({
      total_count: count,
      page: parseInt(page),
      per_page: parseInt(per_page),
      repos: formattedRepos,
    });
  } catch (error) {
    console.error('Error fetching user repositories:', error);
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

  if (!validateUsername(username)) {
    return next(new APIError(400, 'Invalid username format'));
  }

  try {
    console.log(`Refreshing user info for ${username}`);
    // Add the job to the harvester queue
    await harvesterQueue.add({ username }, {
      jobId: `refresh-${username}`,
      removeOnComplete: true
    });

    return res.status(202).json({
      status: 'refreshing',
      message: 'User data is being refreshed. Please try again in a few moments.',
      retryAfter: 5,
      username
    });
  } catch (error) {
    console.error('Error refreshing user info:', error);
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