const Queue = require('bull');
const config = require('../config');
const sequelize = require('../config/database');
const { User, Repository, Activity } = require('../models');
const githubService = require('../services/github');
const redisClient = require('../config/redis'); // Add this import

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
  let user;

  try {
    // Find user
    user = await User.findOne({ where: { username } });

    // 1. Fetch Complete Profile Data
    job.progress(10);
    const userProfile = await githubService.getUserProfile(username);
    console.log(userProfile);

    // 2. Fetch Extra Profile Data (optional fields)
    job.progress(20);
    const extraData = await Promise.all([
      githubService.getUserOrganizations(username),
      githubService.getUserGists(username)
    ]);

    // 3. Fetch Repos with Extended Info
    job.progress(30);
    const userRepos = await githubService.getUserRepos(username);

    // 4. Fetch Recent Activity
    job.progress(40);
    const userActivity = await processUserActivity(username);

    // 5. Process All Data
    job.progress(60);
    const processedUserData = {
      ...processUserProfile(userProfile),
      organizations: extraData[0],
      gists_count: extraData[1].length,
      last_fetched: new Date(),
      is_fetching: false
    };

    const processedRepoData = await githubService.processUserRepos(username, userRepos);

    // 6. Save Everything
    job.progress(90);
    await saveToDatabase(processedUserData, processedRepoData, userActivity);

    // Clear cache after successful update
    await redisClient.del(`user:${username}:profile`);
    await redisClient.del(`user:${username}:repos:*`);

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

    const userProfile = await githubService.getUserProfile(username);
    job.progress(30);

    // Get organizations and gists
    const [orgs, gists] = await Promise.all([
      githubService.getUserOrganizations(username),
      githubService.getUserGists(username)
    ]);

    const userRepos = await githubService.getUserRepos(username);
    job.progress(50);

    const userActivity = await processUserActivity(username);
    job.progress(70);

    const processedUser = {
      ...processUserProfile(userProfile),
      organizations: orgs,
      gists_count: gists.length,
      last_gist_fetch: new Date(),
      last_org_fetch: new Date()
    };

    const processedRepos = await githubService.processUserRepos(username, userRepos);

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

    // Ensure social data is included
    const userDataWithDefaults = {
      ...userData,
      social: userData.social || {},
      is_fetching: false,
      last_fetched: new Date()
    };

    // Find or create user
    const [user, created] = await User.findOrCreate({
      where: { username: userData.username },
      defaults: userDataWithDefaults,
      transaction
    });

    // Update if user exists
    if (!created) {
      await user.update(userDataWithDefaults, { transaction });
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

    // Clear cache after successful update
    await redisClient.del(`user:${userData.username}:profile`);
    await redisClient.del(`user:${userData.username}:repos:*`);

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error saving to database:', error);
    throw error;
  }
}

// Helper functions to process data into the format you need for your database

function extractSocialAccounts(bio, blog) {
  const social = {};

  const patterns = {
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com\/|x\.com\/)([a-zA-Z0-9_]+)|@([a-zA-Z0-9_]+)/i,
      linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|profile)\/([a-zA-Z0-9_-]+)/i,
      youtube: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:c\/|channel\/|user\/)?|youtu\.be\/)([a-zA-Z0-9_-]+)/i,
      mastodon: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9_-]+\.social)\/@([a-zA-Z0-9_]+)/i,
      discord: /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discordapp\.com\/invite\/|discord\.com\/invite\/)([a-zA-Z0-9_-]+)/i,
      facebook: /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.me)\/([a-zA-Z0-9_.]+)/i,
      instagram: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_\.]+)\/?/i,
      twitch: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/i,
      github: /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i,
      medium: /(?:https?:\/\/)?(?:www\.)?medium\.com\/@([a-zA-Z0-9_.-]+)/i,
      dev: /(?:https?:\/\/)?(?:www\.)?dev\.to\/([a-zA-Z0-9_-]+)/i,
      stackoverflow: /(?:https?:\/\/)?(?:www\.)?stackoverflow\.com\/users\/[0-9]+\/([a-zA-Z0-9_-]+)/i,
      telegram: /(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]+)/i,
      gitlab: /(?:https?:\/\/)?(?:www\.)?gitlab\.com\/([a-zA-Z0-9_-]+)/i,
      behance: /(?:https?:\/\/)?(?:www\.)?behance\.net\/([a-zA-Z0-9_-]+)/i,
      dribbble: /(?:https?:\/\/)?(?:www\.)?dribbble\.com\/([a-zA-Z0-9_-]+)/i,
      hashnode: /(?:https?:\/\/)?(?:www\.)?hashnode\.com\/@([a-zA-Z0-9_-]+)/i
  };

  const extract = (text, platform) => {
      if (!text) return;
      const match = text.match(patterns[platform]);
      if (match) {
          // Find first non-null capture group
          const username = match.slice(1).find(group => group);
          if (username) {
              social[platform] = username.toLowerCase();
          }
      }
  };

  // Extract from both bio and blog
  [bio, blog].forEach(text => {
      if (text) {
          Object.keys(patterns).forEach(platform => {
              if (!social[platform]) { // Only extract if not already found
                  extract(text, platform);
              }
          });
      }
  });

  // Clean up the social object by removing null/undefined values
  Object.keys(social).forEach(key => {
      if (!social[key]) {
          delete social[key];
      }
  });

  return social;
}

function processUserProfile(data) {
  // First get social accounts from GitHub API
  const social = {
      twitter: data.twitter_username || null,
      instagram: data.instagram_username || null,
      github: data.login || null,
  };

  // Extract additional social accounts from bio and blog
  const extractedSocial = extractSocialAccounts(data.bio, data.blog);

  // Merge the social accounts, preferring the GitHub API data
  const mergedSocial = {
      ...extractedSocial,
      ...social,
      // Only keep values from social object that exist
      ...Object.fromEntries(
          Object.entries(social)
              .filter(([_, value]) => value !== null)
      )
  };

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
      social: mergedSocial,
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