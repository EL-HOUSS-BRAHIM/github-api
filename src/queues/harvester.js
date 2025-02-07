const Queue = require('bull');
const config = require('../config');
const sequelize = require('../config/database'); // Add this import
const { User, Repository, Activity } = require('../models');
const githubService = require('../services/github');

const harvesterQueue = new Queue('githubHarvester', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    tls: {} // Enable TLS for Aiven Redis
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Add event listeners for better monitoring
harvesterQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed for username ${job.data.username}:`, err);
});

harvesterQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed for username ${job.data.username}`);
});

// Add more detailed logging to harvesterQueue
harvesterQueue.on('active', (job) => {
  console.log(`Processing job ${job.id} for username ${job.data.username}`);
});

harvesterQueue.on('stalled', (job) => {
  console.log(`Job ${job.id} has stalled`);
});

harvesterQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Process jobs with concurrency limit
harvesterQueue.process(5, async (job) => {
  const { username } = job.data;

  try {
    // 1. Fetch Data
    job.progress(10);
    const userProfile = await githubService.getUserProfile(username);

    job.progress(30);
    const userRepos = await githubService.getUserRepos(username);

    job.progress(40);
    const userActivity = await processUserActivity(username);

    // 2. Process Data
    job.progress(60);
    const processedUserData = processUserProfile(userProfile);
    const processedRepoData = await githubService.processUserRepos(username, userRepos);

    // 3. Save to Database
    job.progress(90);
    await saveToDatabase(processedUserData, processedRepoData, userActivity);

    job.progress(100);
    return { success: true, username };
  } catch (error) {
    console.error(`Job failed for ${username}:`, error);
    throw error;
  }
});

// Update the refresh-user process handler
// In the refresh-user process handler, update the processUserRepos call:
harvesterQueue.process('refresh-user', 5, async (job) => {
  const { username } = job.data;

  try {
    job.progress(10);
    console.log(`Starting refresh for user ${username}`);

    // Fetch fresh data from GitHub
    const userProfile = await githubService.getUserProfile(username);
    job.progress(30);

    const userRepos = await githubService.getUserRepos(username);
    job.progress(50);

    const userActivity = await processUserActivity(username);
    job.progress(70);

    // Process and save data
    const processedUser = processUserProfile(userProfile);
    const processedRepos = await githubService.processUserRepos(username, userRepos); // Using imported function

    // Update database
    await saveToDatabase(processedUser, processedRepos, userActivity);

    job.progress(100);
    console.log(`Refresh completed for user ${username}`);

    return { success: true, username };

  } catch (error) {
    console.error(`Refresh failed for ${username}:`, error);
    throw error;
  }
});

// Update saveToDatabase function
async function saveToDatabase(userData, repoData, activityData) {
  let transaction;
  try {
    // Start transaction
    transaction = await sequelize.transaction();

    // Find or create user
    const [user, created] = await User.findOrCreate({
      where: { username: userData.username },
      defaults: userData,
      transaction
    });

    // Update if user exists
    if (!created) {
      await user.update(userData, { transaction });
    }

    // Upsert repositories
    for (const repo of repoData) {
      await Repository.upsert({
        ...repo,
        user_id: user.id
      }, { transaction });
    }

    // Replace activities
    await Activity.destroy({
      where: { user_id: user.id },
      transaction
    });

    if (activityData.length > 0) {
      await Activity.bulkCreate(
        activityData.map(activity => ({ ...activity, user_id: user.id })),
        { transaction }
      );
    }

    // Commit transaction
    await transaction.commit();

  } catch (error) {
    // Rollback transaction on error
    if (transaction) await transaction.rollback();
    console.error('Error saving to database:', error);
    throw error;
  }
}

// Helper functions to process data into the format you need for your database

function processUserProfile(data) {
  return {
    username: data.login,
    full_name: data.name,
    avatar_url: data.avatar_url,
    bio: data.bio,
    location: data.location,
    company: data.company,
    website: data.blog,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
    social: {
      twitter: data.twitter_username,
    },
  };
}

// Remove or comment out the local processUserRepos function since we're using the one from githubService
/*
function processUserRepos(repos) {
  return repos.map(repo => ({
    name: repo.name,
    description: repo.description,
    topics: repo.topics,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    issues: repo.open_issues_count,
    last_commit: repo.pushed_at ? new Date(repo.pushed_at) : null,
    commit_count: 0,
    pull_request_count: 0,
  }));
}
*/

async function processUserActivity(username) {
  const allActivity = [];
  let page = 1;
  const perPage = 100;
  let keepFetching = true;

  while (keepFetching && page <= 3) { // Limit to 3 pages (GitHub's limit)
    try {
      const activityPage = await githubService.getUserActivity(username, page, perPage);

      if (activityPage.length === 0) {
        keepFetching = false;
      } else {
        allActivity.push(...activityPage);
        page++;
        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      if (error.response?.status === 422) {
        console.log(`Reached GitHub's pagination limit for ${username}`);
        break;
      }
      console.error(`Error fetching activity page ${page} for ${username}:`, error);
      keepFetching = false;
    }
  }

  const processedActivity = aggregateActivity(allActivity);
  return processedActivity;
}

function aggregateActivity(activity) {
  const dailyCounts = {};

  activity.forEach(event => {
    const date = new Date(event.created_at).toISOString().slice(0, 10);

    if (!dailyCounts[date]) {
      dailyCounts[date] = {
        commits: 0,
        pull_requests: 0,
        issues_opened: 0,
      };
    }

    switch (event.type) {
      case 'PushEvent':
        dailyCounts[date].commits += event.payload.commits.length;
        break;
      case 'PullRequestEvent':
        dailyCounts[date].pull_requests += 1;
        break;
      case 'IssuesEvent':
        if (event.payload.action === 'opened') {
          dailyCounts[date].issues_opened += 1;
        }
        break;
      default:
        break;
    }
  });

  return Object.entries(dailyCounts).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

module.exports = harvesterQueue;