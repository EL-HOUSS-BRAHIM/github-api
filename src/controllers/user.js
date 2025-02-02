const { User, Repository, Activity } = require('../models');
const harvesterQueue = require('../queues/harvester');
const reportService = require('../services/report');
const { validateUsername, validatePagination } = require('../utils/validation');
const redisClient = require('../config/redis'); // Assuming you set up a Redis client

async function getUserProfile(req, res) {
  const { username } = req.params;

  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
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
      return res.status(404).json({ error: 'User not found. Data is being fetched.' });
    }

    // 4. Process and Format Data
    const profile = {
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      // ... other fields
    };

    // 5. Cache the result (with an expiry, e.g., 1 hour)
    await redisClient.set(`user:${username}:profile`, JSON.stringify(profile), 'EX', 3600);

    return res.json(profile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUserRepos(req, res) {
  const { username } = req.params;
  const { page = 1, per_page = 10 } = req.query;

  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }
  if (!validatePagination(page, per_page)) {
    return res.status(400).json({ error: 'Invalid pagination parameters' });
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
      return res.status(404).json({ error: 'User not found' });
    }

    // Find repos with pagination
    const { count, rows: repos } = await Repository.findAndCountAll({
      where: { user_id: user.id },
      offset: (page - 1) * per_page,
      limit: per_page,
    });

    // Format repo data
    const formattedRepos = repos.map(repo => ({
      name: repo.name,
      description: repo.description,
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
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUserActivity(req, res) {
  const { username } = req.params;

  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
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
      return res.status(404).json({ error: 'User not found' });
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
        formattedActivity.daily[date] = 0;
      }
      formattedActivity.daily[date] += activity.commits; // Assuming you track commits, adjust as needed

      if (!formattedActivity.monthly[month]) {
        formattedActivity.monthly[month] = 0;
      }
      formattedActivity.monthly[month] += activity.commits;
    });

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(formattedActivity), 'EX', 3600);

    return res.json(formattedActivity);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAggregatedReport(req, res) {
  const { username } = req.params;

  if (!validateUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
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
      return res.status(404).json({ error: 'User not found. Data is being fetched.' });
    }

    // Generate report using the service
    const report = reportService.generateReport(user);

    // Cache the result
    await redisClient.set(cacheKey, JSON.stringify(report), 'EX', 3600);

    return res.json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getUserProfile,
  getUserRepos,
  getUserActivity,
  getAggregatedReport,
};
