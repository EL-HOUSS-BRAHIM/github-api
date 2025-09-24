const githubApi = require('./httpClient');
const { buildLocationQueries, findCountryConfig } = require('./location');
const { fetchUserRepos, getRepoCommitCount, processUserRepos } = require('./repos');
const { extractSocialAccounts } = require('./transformers');
const { APIError } = require('../../utils/errors');
const tokenManager = require('./tokenManager');

const MAX_LOCATION_PAGES = 5;
const LOCATION_DELAY_MS = 2000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeWaitTime(resetHeader) {
  if (!resetHeader) {
    return 0;
  }

  const resetMs = Number(resetHeader) * 1000;
  if (Number.isNaN(resetMs)) {
    return 0;
  }

  return Math.max(0, resetMs - Date.now()) + 1000;
}

function buildRateLimitSnapshot(headers) {
  if (!headers) {
    return null;
  }

  return {
    remaining: headers['x-ratelimit-remaining'],
    reset: headers['x-ratelimit-reset'],
    used: headers['x-ratelimit-used'],
    resource: headers['x-ratelimit-resource'],
    tokenPool: tokenManager.getTokenPoolSize(),
  };
}

async function getUserProfile(username) {
  try {
    console.log(`Making GitHub API request for user ${username}...`);
    const response = await githubApi.get(`/users/${username}`);
    console.log('GitHub API response received');
    return response.data;
  } catch (error) {
    console.error('GitHub API Error:', {
      status: error.response?.status,
      message: error.message,
      rateLimit: error.response?.headers?.['x-ratelimit-remaining'],
    });
    throw error;
  }
}

async function getUserRepos(username, page = 1, perPage = 100) {
  return fetchUserRepos(username, page, perPage);
}

async function getUserActivity(username, page = 1, perPage = 100) {
  try {
    if (page > 3) {
      console.log(`Skipping page ${page} - GitHub limits events to first 300 items`);
      return [];
    }

    const response = await githubApi.get(`/users/${username}/events`, {
      params: {
        page,
        per_page: perPage,
      },
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 422) {
      console.log(`Pagination limit reached for ${username}'s events`);
      return [];
    }
    console.error(`Error fetching activity for ${username}:`, error.message);
    throw error;
  }
}

async function searchUsersByLocation(location, _page = 1) {
  const searchLocation = location.toLowerCase().trim();
  const countryConfig = findCountryConfig(searchLocation);

  if (!countryConfig) {
    throw new APIError(400, `Invalid country specified: ${location}`);
  }

  const searchQueries = buildLocationQueries(countryConfig);
  const allItems = new Map();
  let rateLimit = null;

  for (const query of searchQueries) {
    let page = 1;

    while (page <= MAX_LOCATION_PAGES) {
      try {
        console.log(`Making location query: ${query}, page: ${page}`);

        const results = await githubApi.get('/search/users', {
          params: {
            q: `${query} followers:>31`,
            sort: 'followers',
            order: 'desc',
            per_page: 100,
            page,
          },
        });

        rateLimit = buildRateLimitSnapshot(results.headers);

        if (!results.data.items?.length) {
          break;
        }

        results.data.items.forEach((user) => {
          if (!allItems.has(user.id)) {
            allItems.set(user.id, user);
          }
        });

        await delay(LOCATION_DELAY_MS);

        if (rateLimit?.remaining && parseInt(rateLimit.remaining, 10) < 10) {
          console.log('Rate limit nearly reached, waiting...');
          const waitTime = computeWaitTime(rateLimit.reset);
          if (waitTime > 0) {
            await delay(waitTime);
          }
        }

        page += 1;
      } catch (error) {
        console.warn(`Query failed: ${query}, page: ${page}`, error.message);
        if (error.response?.status === 403 && rateLimit?.reset) {
          console.log('Rate limit reached, pausing queries');
          const waitTime = computeWaitTime(rateLimit.reset);
          if (waitTime > 0) {
            await delay(waitTime);
          }
        }
        break;
      }
    }
  }

  const uniqueItems = Array.from(allItems.values());
  console.log(`Total unique users found: ${uniqueItems.length}`);

  return {
    total_count: uniqueItems.length,
    items: uniqueItems,
    rateLimit,
  };
}

async function getUserOrganizations(username) {
  try {
    const response = await githubApi.get(`/users/${username}/orgs`, {
      params: {
        per_page: 100,
      },
    });

    return response.data.map((org) => ({
      id: org.id,
      login: org.login,
      avatar_url: org.avatar_url,
      description: org.description,
    }));
  } catch (error) {
    console.error(`Error fetching organizations for ${username}:`, error.message);
    return [];
  }
}

async function getUserGists(username) {
  try {
    const response = await githubApi.get(`/users/${username}/gists`, {
      params: {
        per_page: 100,
      },
    });

    return response.data.map((gist) => ({
      id: gist.id,
      description: gist.description,
      created_at: gist.created_at,
      updated_at: gist.updated_at,
      files: Object.keys(gist.files || {}),
    }));
  } catch (error) {
    console.error(`Error fetching gists for ${username}:`, error.message);
    return [];
  }
}

async function getUserSocialAccounts(username) {
  try {
    const response = await githubApi.get(`/users/${username}/social_accounts`, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    const accounts = response.data || [];
    const social = {};

    accounts.forEach((account) => {
      const parts = account.url.split('/');
      const extracted = parts[parts.length - 1];
      social[account.provider] = extracted;
    });

    return social;
  } catch (error) {
    console.error(`Error fetching social accounts for ${username}:`, error.message);
    return {};
  }
}

module.exports = {
  extractSocialAccounts,
  getRepoCommitCount,
  getUserActivity,
  getUserGists,
  getUserOrganizations,
  getUserProfile,
  getUserRepos,
  getUserSocialAccounts,
  processUserRepos,
  searchUsersByLocation,
};
