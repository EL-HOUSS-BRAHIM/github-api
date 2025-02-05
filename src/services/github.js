const axios = require('axios');
const config = require('../config');
const configJson = require('../config/config.json');
const { APIError } = require('../utils/errors');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${config.githubToken}`,
    Accept: 'application/vnd.github.v3+json', // Specify API version
  },
});

// Add this after existing imports
const countryVariations = {
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

async function searchUsersByLocation(location) {
  try {
    const searchLocation = location.toLowerCase().trim();
    const countryConfig = findCountryConfig(searchLocation);

    if (!countryConfig) {
      throw new APIError(400, `Invalid country specified: ${location}`);
    }

    const searchQueries = buildLocationQueries(countryConfig);
    let allItems = new Map(); // Use Map to track unique users
    let totalCount = 0;
    let rateLimit = null;

    // Search through multiple pages for each query
    for (const query of searchQueries) {
      let page = 1;
      let hasMoreResults = true;

      while (hasMoreResults) {
        try {
          console.log(`Making location query: ${query}, page: ${page}`);
          
          const results = await githubApi.get('/search/users', {
            params: {
              q: `${query} followers:>30`,
              sort: 'followers',
              order: 'desc',
              per_page: 100,
              page
            }
          });

          // Store rate limit info
          rateLimit = {
            remaining: results.headers['x-ratelimit-remaining'],
            reset: results.headers['x-ratelimit-reset']
          };

          // Process results
          if (results.data.items?.length > 0) {
            results.data.items.forEach(user => {
              if (!allItems.has(user.id)) {
                allItems.set(user.id, user);
              }
            });

            // Check if we should continue pagination
            hasMoreResults = results.data.items.length === 100;
            page++;
          } else {
            hasMoreResults = false;
          }

          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check rate limit
          if (rateLimit.remaining === '0') {
            console.log('Rate limit reached, pausing queries');
            const resetTime = new Date(rateLimit.reset * 1000);
            const waitTime = resetTime - Date.now() + 1000;
            if (waitTime > 0) {
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }

        } catch (error) {
          console.warn(`Query failed: ${query}, page: ${page}`, error.message);
          if (error.response?.status === 403) {
            console.log('Rate limit reached, stopping current query');
            break;
          }
          hasMoreResults = false;
        }
      }
    }

    const uniqueItems = Array.from(allItems.values());
    
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

  // Add country name variations
  queries.add(`location:"${countryConfig.geoName}"`);
  queries.add(`location:"${countryConfig.country}"`);
  variations.forEach(v => queries.add(`location:"${v}"`));

  // Add major cities with proper formatting
  if (countryConfig.cities?.length > 0) {
    // Split cities into smaller chunks to avoid query length limits
    const cityChunks = chunk(countryConfig.cities, 3);
    for (const cities of cityChunks) {
      const cityQuery = cities
        .map(city => `location:"${city.trim()}"`)
        .join(' OR ');
      queries.add(`(${cityQuery})`);
    }
  }

  // Add fuzzy matching for country name
  queries.add(`location:*${countryConfig.geoName}*`);
  
  return Array.from(queries);
}

// Helper function to get common country name variations
function getCountryVariations(countryName) {
  const variations = new Set([countryName]);
  
  // Common country name mappings
  const countryMappings = {
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

module.exports = {
  getUserProfile,
  getUserRepos,
  getUserActivity,
  searchUsersByLocation, // Export the new method
};