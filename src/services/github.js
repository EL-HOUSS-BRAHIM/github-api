const axios = require('axios');
const config = require('../config');
const { APIError } = require('../utils/errors');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${config.githubToken}`,
    Accept: 'application/vnd.github.v3+json', // Specify API version
  },
});

// Intercept responses to handle common errors (e.g., rate limiting)
githubApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        return Promise.reject(new APIError(404, 'Resource not found on GitHub'));
      } else if (status === 403) {
        // Check for rate limit headers (if available)
        const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
        const rateLimitReset = error.response.headers['x-ratelimit-reset'];

        if (rateLimitRemaining === '0') {
          const resetTime = rateLimitReset ? new Date(rateLimitReset * 1000) : null;
          return Promise.reject(new APIError(403, `GitHub API rate limit exceeded. Resets at ${resetTime}`));
        } else {
          return Promise.reject(new APIError(403, 'GitHub API request forbidden'));
        }
      } else if (status >= 500) {
        return Promise.reject(new APIError(status, 'GitHub API server error'));
      }
    }
    return Promise.reject(error); // Re-throw other errors
  }
);

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
      rateLimit: error.response?.headers?.['x-ratelimit-remaining']
    });
    throw error;
  }
}

async function getUserRepos(username, page = 1, perPage = 100) {
  try {
    const response = await githubApi.get(`/users/${username}/repos`, {
      params: {
        page,
        per_page: perPage,
        sort: 'updated', // You might want to sort by 'updated' or 'pushed'
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching repos for ${username}:`, error.message);
    throw error;
  }
}

async function getUserActivity(username, page = 1, perPage = 100) {
  try {
    const response = await githubApi.get(`/users/${username}/events`, {
      params: {
        page,
        per_page: perPage,
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching activity for ${username}:`, error.message);
    throw error;
  }
}

module.exports = {
  getUserProfile,
  getUserRepos,
  getUserActivity,
};