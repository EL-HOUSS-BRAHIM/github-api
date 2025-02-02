const axios = require('axios');
const config = require('../config');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${config.githubToken}`,
  },
});

async function getUserProfile(username) {
  try {
    const response = await githubApi.get(`/users/${username}`);
    return response.data;
  } catch (error) {
    // Handle errors (404, rate limits, etc.)
    console.error(`Error fetching user ${username}:`, error.response.status);
    if (error.response.status === 404) {
      throw new Error('User not found');
    }
    throw error; // Re-throw for other errors
  }
}

async function getUserRepos(username, page = 1, perPage = 100) {
  try {
    const response = await githubApi.get(`/users/${username}/repos`, {
      params: {
        page,
        per_page: perPage,
        sort: 'updated' // You might want to sort
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching repos for ${username}:`, error.message);
    throw error;
  }
}

async function getUserActivity(username) {
  try {
    // Fetch events, you might need to paginate through multiple pages
    const response = await githubApi.get(`/users/${username}/events`);
    return response.data;
    // Process and aggregate activity data (daily/monthly counts)
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
