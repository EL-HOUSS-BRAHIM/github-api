const axios = require('axios');
const config = require('../config');
const configJson = require('../config/config.json');
const { APIError } = require('../utils/errors');

let currentTokenIndex = 0;

function getNextToken() {
  const token = config.githubTokens[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % config.githubTokens.length;
  return token;
}

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${getNextToken()}`,
    Accept: 'application/vnd.github.v3+json', // Specify API version
  },
});

// Add this after existing imports
const countryVariations = {
  'morocco': ['MA', 'maroc', 'المغرب', 'maghreb', 'marocco', 'marruecos', 'مراكش', 'MAROCCO'],
  'united states': ['usa', 'u.s.a', 'united states of america', 'us', 'u.s.'],
  'united kingdom': ['uk', 'u.k', 'great britain', 'england'],
  'france': ['république française', 'republique francaise', 'francia'],
  'germany': ['deutschland', 'allemagne'],
  'spain': ['españa', 'espana', 'espagne'],
  'china': ['中国', 'zhongguo', 'prc'],
  'japan': ['日本', 'nippon', 'nihon'],
  'south korea': ['한국', 'hanguk', 'korea'],
  'russia': ['российская федерация', 'rossiya', 'russian federation'],
  // Add more variations as needed
};

// Intercept responses to handle common errors (e.g., rate limiting)
githubApi.interceptors.response.use(
  (response) => response,
  async (error) => {
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
          console.log(`Rate limit exceeded. Retrying after ${resetTime}`);
          await new Promise(resolve => setTimeout(resolve, (resetTime - Date.now()) + 1000));
          // Switch to the next token
          githubApi.defaults.headers.Authorization = `token ${getNextToken()}`;
          return githubApi.request(error.config);
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

async function searchUsersByLocation(location) {
  try {
    const searchLocation = location.toLowerCase().trim();
    const countryConfig = findCountryConfig(searchLocation);

    if (!countryConfig) {
      throw new APIError(400, `Invalid country specified: ${location}`);
    }

    const searchQueries = buildLocationQueries(countryConfig);
    let allItems = new Map();
    let rateLimit = null;
    const MAX_PAGES = 5; // Reduce the number of pages to avoid rate limiting
    const DELAY = 2000; // Increased delay between requests

    for (const query of searchQueries) {
      let page = 1;
      
      while (page <= MAX_PAGES) {
        try {
          console.log(`Making location query: ${query}, page: ${page}`);
          
          const results = await githubApi.get('/search/users', {
            params: {
              q: `${query} followers:>31`,
              sort: 'followers',
              order: 'desc',
              per_page: 100,
              page
            }
          });

          rateLimit = {
            remaining: results.headers['x-ratelimit-remaining'],
            reset: results.headers['x-ratelimit-reset']
          };

          if (!results.data.items?.length) {
            break;
          }

          results.data.items.forEach(user => {
            if (!allItems.has(user.id)) {
              allItems.set(user.id, user);
            }
          });

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, DELAY));

          // Check rate limit
          if (parseInt(rateLimit.remaining) < 10) {
            console.log('Rate limit nearly reached, waiting...');
            const resetTime = new Date(rateLimit.reset * 1000);
            const waitTime = Math.max(0, resetTime - Date.now()) + 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          page++;
        } catch (error) {
          console.warn(`Query failed: ${query}, page: ${page}`, error.message);
          if (error.response?.status === 403) {
            console.log('Rate limit reached, pausing queries');
            const resetTime = new Date(rateLimit.reset * 1000);
            const waitTime = Math.max(0, resetTime - Date.now()) + 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
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
      rateLimit
    };

  } catch (error) {
    console.error('GitHub Search Error:', error);
    throw error;
  }
}

// Helper function to find country configuration using various matching methods
function findCountryConfig(searchLocation) {
  const locations = configJson.locations;
  const search = searchLocation.toLowerCase().trim();
  
  // Direct match
  let countryConfig = locations.find(c => 
    c.country.toLowerCase() === search ||
    c.geoName.toLowerCase() === search
  );
  
  if (countryConfig) return countryConfig;

  // Check variations
  return locations.find(c => {
    const variations = countryVariations[c.country.toLowerCase()] || [];
    return variations.some(v => v.toLowerCase() === search);
  });
}

// Helper function to build search queries for a country
function buildLocationQueries(countryConfig) {
  const queries = new Set();
  const variations = countryVariations[countryConfig.country.toLowerCase()] || [];

  // Add country name variations with different formats
  queries.add(`location:"${countryConfig.geoName}"`);
  queries.add(`location:"${countryConfig.country}"`);
  queries.add(`location:${countryConfig.geoName}`); // Without quotes
  variations.forEach(v => queries.add(`location:"${v}"`));

  // Add major cities in smaller chunks
  if (countryConfig.cities?.length > 0) {
    const cityChunks = chunk(countryConfig.cities, 2); // Reduced chunk size
    for (const cities of cityChunks) {
      const cityQuery = cities
        .map(city => `location:"${city.trim()}"`)
        .join(' OR ');
      queries.add(`(${cityQuery})`);
    }
  }

  // Add fuzzy matching variations
  queries.add(`location:*${countryConfig.geoName}*`);
  queries.add(`location:*${countryConfig.country}*`);
  
  return Array.from(queries);
}

// Helper function to get common country name variations
function getCountryVariations(countryName) {
  const variations = new Set([countryName]);
  
  // Common country name mappings
  const countryMappings = {
    'morocco': ['MA', 'maroc', 'maghreb', 'marocco', 'marruecos', 'المغرب', 'مراكش', 'MOROCCO'],
    'united states': ['usa', 'u.s.a', 'united states of america', 'us', 'u.s.'],
    'united kingdom': ['uk', 'u.k', 'great britain', 'england'],
    'united arab emirates': ['uae', 'u.a.e', 'emirates'],
    'south korea': ['korea'],
    'russia': ['russian federation'],
    'china': ['prc', 'peoples republic of china'],
    'france': ['république française', 'republique francaise'],
    'germany': ['deutschland'],
    'spain': ['españa', 'espana'],
    'japan': ['nippon', '日本'],
    // Add more variations as needed
  };

  // Add known variations for the country
  Object.entries(countryMappings).forEach(([key, values]) => {
    if (countryName.includes(key)) {
      values.forEach(v => variations.add(v.toLowerCase()));
    }
  });

  return Array.from(variations);
}

// Helper function to chunk array
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Add this new function to get commit count
async function getRepoCommitCount(username, repo) {
  try {
    // Use the statistics endpoint to get commit count
    const response = await githubApi.get(`/repos/${username}/${repo}/stats/participation`);
    
    if (response.data && response.data.all) {
      // Sum up all commits from the last 52 weeks
      return response.data.all.reduce((sum, count) => sum + count, 0);
    }
    
    // Fallback to counting commits manually if stats are not available
    const commits = await githubApi.get(`/repos/${username}/${repo}/commits`, {
      params: {
        per_page: 1,
        page: 1
      }
    });

    // Get total from response headers
    const total = parseInt(commits.headers['x-total-count'] || commits.headers['link'], 10);
    return isNaN(total) ? 0 : total;
  } catch (error) {
    console.warn(`Error fetching commit count for ${username}/${repo}:`, error.message);
    return 0;
  }
}

// Modify processUserRepos to include the commit count
async function processUserRepos(username, repos) {
  const processedRepos = [];
  
  for (const repo of repos) {
    try {
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const commitCount = await getRepoCommitCount(username, repo.name);
      
      processedRepos.push({
        name: repo.name,
        description: repo.description,
        topics: repo.topics,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        issues: repo.open_issues_count,
        last_commit: repo.pushed_at ? new Date(repo.pushed_at) : null,
        commit_count: commitCount,
        pull_request_count: 0, // We'll handle this separately if needed
      });
    } catch (error) {
      console.error(`Error processing repo ${repo.name}:`, error);
      // Add repo with default values if there's an error
      processedRepos.push({
        name: repo.name,
        description: repo.description,
        topics: repo.topics,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        issues: repo.open_issues_count,
        last_commit: repo.pushed_at ? new Date(repo.pushed_at) : null,
        commit_count: 0,
        pull_request_count: 0,
      });
    }
  }
  
  return processedRepos;
}

module.exports = {
  getUserProfile,
  getUserRepos,
  getUserActivity,
  searchUsersByLocation, // Export the new method
  getRepoCommitCount,
};