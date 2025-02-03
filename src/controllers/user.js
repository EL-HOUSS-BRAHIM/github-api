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

  if (!validateUsername(username)) {
    return next(new APIError(400, 'Invalid username format'));
  }

  try {
    // 1. Check Cache (Redis)
    const cachedProfile = await redisClient.get(`user:${username}:profile`);
    if (cachedProfile) {
      return res.json(JSON.parse(cachedProfile));
    }

    // 2. Check Database
    const user = await User.findOne({ where: { username } });
    if (!user) {
      // 3. Trigger Data Harvesting (if not found)
      harvesterQueue.add({ username });
      return next(new APIError(404, 'User not found. Data is being fetched.'));
    }

    // 4. Process and Format Data
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
      // ... other fields
    };

    // 5. Cache the result (with an expiry, e.g., 1 hour)
    await redisClient.set(`user:${username}:profile`, JSON.stringify(profile), 'EX', 3600);

    return res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return next(error); // Pass error to error handling middleware
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

  if (!validateUsername(username)) {
    return next(new APIError(400, 'Invalid username format'));
  }

  try {
    // Check cache
    const cacheKey = `user:${username}:activity`;
    const cachedActivity = await redisClient.get(cacheKey);
    if (cachedActivity) {
      return res.json(JSON.parse(cachedActivity));
    }

    // Find user
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return next(new APIError(404, 'User not found'));
    }

    // Find activity
    const activities = await Activity.findAll({
      where: { user_id: user.id },
      order: [['date', 'ASC']], // Order by date
    });

    // Format activity data
    const formattedActivity = {
      daily: {},
      monthly: {},
    };

    activities.forEach(activity => {
      const date = activity.date.toISOString().slice(0, 10); // YYYY-MM-DD
      const month = date.slice(0, 7); // YYYY-MM

      if (!formattedActivity.daily[date]) {
        formattedActivity.daily[date] = {
          commits: 0,
          pull_requests: 0,
          issues_opened: 0,
        };
      }
      formattedActivity.daily[date].commits += activity.commits;
      formattedActivity.daily[date].pull_requests += activity.pull_requests;
      formattedActivity.daily[date].issues_opened += activity.issues_opened;

      if (!formattedActivity.monthly[month]) {
        formattedActivity.monthly[month] = {
          commits: 0,
          pull_requests: 0,
          issues_opened: 0,
        };
      }
      formattedActivity.monthly[month].commits += activity.commits;
      formattedActivity.monthly[month].pull_requests += activity.pull_requests;
      formattedActivity.monthly[month].issues_opened += activity.issues_opened;
    });

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(formattedActivity), 'EX', 3600);

    return res.json(formattedActivity);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return next(error);
  }
}

/**
 * @description Get aggregated user report
 * @route GET /api/user/:username/report
 */
async function getAggregatedReport(req, res, next) {
  const { username } = req.params;

  if (!validateUsername(username)) {
    return next(new APIError(400, 'Invalid username format'));
  }

  try {
    // Check cache
    const cacheKey = `user:${username}:report`;
    const cachedReport = await redisClient.get(cacheKey);
    if (cachedReport) {
      return res.json(JSON.parse(cachedReport));
    }

    const user = await User.findOne({
      where: { username },
      include: [
        {
          model: Repository,
          limit: 10, // Limit the number of repos for the report
          order: [['stars', 'DESC']], // Order by stars (or another metric)
        },
        {
          model: Activity,
          limit: 365, // Limit to the last 365 days for the report
          order: [['date', 'DESC']],
        },
      ],
    });

    if (!user) {
      // Trigger data harvesting if not found
      harvesterQueue.add({ username });
      return next(new APIError(404, 'User not found. Data is being fetched.'));
    }

    // Generate report using the service
    const report = reportService.generateReport(user);

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(report), 'EX', 3600);

    return res.json(report);
  } catch (error) {
    console.error('Error fetching aggregated report:', error);
    return next(error);
  }
}

module.exports = {
  getUserProfile,
  getUserRepos,
  getUserActivity,
  getAggregatedReport,
};