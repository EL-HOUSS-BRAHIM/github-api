const Queue = require('bull');
const config = require('../config');
const { User, Repository, Activity } = require('../models');
const githubService = require('../services/github');

const harvesterQueue = new Queue('githubHarvester', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
  },
});

harvesterQueue.process(async (job) => {
  const { username } = job.data;

  try {
    // 1. Fetch Data from GitHub
    const userProfile = await githubService.getUserProfile(username);
    const userRepos = await githubService.getUserRepos(username);
    const userActivity = await githubService.getUserActivity(username);

    // 2. Process and Clean Data
    const processedUserData = processUserProfile(userProfile); // Implement these helper functions
    const processedRepoData = processUserRepos(userRepos);
    const processedActivityData = processUserActivity(userActivity);

    // 3. Insert/Update in Database
    const [user, created] = await User.findOrCreate({
      where: { username: processedUserData.username },
      defaults: processedUserData,
    });

    if (!created) {
      // Update existing user
      await user.update(processedUserData);
    }

    // Upsert repositories (update or insert)
    for (const repo of processedRepoData) {
      const [repoInstance, repoCreated] = await Repository.findOrCreate({
        where: { user_id: user.id, name: repo.name },
        defaults: { ...repo, user_id: user.id },
      });
      if (!repoCreated) {
        await repoInstance.update(repo);
      }
    }

    // Upsert Activity data (or create a separate table for aggregated counts)
    for (const activity of processedActivityData) {
      await Activity.create({
        ...activity,
        user_id: user.id
      });
    }

    console.log(`Data harvested for ${username}`);
    return { success: true };
  } catch (error) {
    console.error(`Error harvesting data for ${username}:`, error);
    throw error; // Important to re-throw so Bull can retry
  }
});

// Helper functions to process data into the format you need for your database
function processUserProfile(data) {
  // ... extract and format fields, e.g.,
  return {
    username: data.login,
    full_name: data.name,
    avatar_url: data.avatar_url,
    bio: data.bio,
    location: data.location,
    // ... other fields
  };
}

function processUserRepos(repos) {
  return repos.map(repo => ({
    name: repo.name,
    description: repo.description,
    topics: repo.topics,
    // ... other fields
    last_commit: repo.pushed_at ? new Date(repo.pushed_at) : null
  }));
}

function processUserActivity(activity) {
  const dailyCounts = {};
  const monthlyCounts = {};

  activity.forEach(event => {
      const date = new Date(event.created_at).toISOString().slice(0, 10); // YYYY-MM-DD
      const month = date.slice(0, 7); // YYYY-MM

      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });

  const dailyActivity = Object.entries(dailyCounts).map(([date, count]) => ({
      date: date,
      commits: count,  // You might differentiate event types here
      // ... other activity types
  }));

  // You could create monthly activity entries here as well

  return dailyActivity; // Or return both daily and monthly
}

module.exports = harvesterQueue;
