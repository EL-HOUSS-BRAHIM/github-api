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
    // GitHub limits events API to first 300 events (3 pages)
    if (page > 3) {
      console.log(`Skipping page ${page} - GitHub limits events to first 300 items`);
      return [];
    }

    const response = await githubApi.get(`/users/${username}/events`, {
      params: {
        page,
        per_page: perPage,
      }
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 422) {
      console.log(`Pagination limit reached for ${username}'s events`);
      return []; // Return empty array to stop pagination
    }
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
    'russia': ['российская федерация', 'rossiya', 'russian federation'],
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

// Add cache for commit counts
const commitCountCache = new Map();

// Add this new function to get commit count
async function getRepoCommitCount(username, repoName) {
  const cacheKey = `${username}/${repoName}`;

  if (commitCountCache.has(cacheKey)) {
    return commitCountCache.get(cacheKey);
  }

  try {
    const response = await githubApi.get(`/repos/${username}/${repoName}/commits`, {
      params: {
        per_page: 1
      }
    });

    let count = 0;

    // Get total from Link header
    const link = response.headers.link;
    if (link) {
      const match = link.match(/page=(\d+)>; rel="last"/);
      if (match) {
        count = parseInt(match[1], 10);
        commitCountCache.set(cacheKey, count);
        return count;
      }
    }

    // Manual count if no Link header
    count = await countCommitsManually(username, repoName);
    commitCountCache.set(cacheKey, count);
    return count;

  } catch (error) {
    console.warn(`Error fetching commit count for ${cacheKey}:`, error.message);
    return 0;
  }
}

// Add helper for manual commit counting
async function countCommitsManually(username, repoName) {
  let count = 0;
  let page = 1;
  const PER_PAGE = 100;

  while (true) {
    try {
      const response = await githubApi.get(`/repos/${username}/${repoName}/commits`, {
        params: {
          per_page: PER_PAGE,
          page
        }
      });

      const commits = response.data;
      count += commits.length;

      if (commits.length < PER_PAGE) break;
      page++;

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      break;
    }
  }

  return count;
}

// Update processUserRepos function
async function processUserRepos(username, repos) {
  const processedRepos = [];

  for (const repo of repos) {
    try {
      console.log(`Fetching commit count for ${username}/${repo.name}...`);

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

      const commitCount = await getRepoCommitCount(username, repo.name);
      console.log(`Got ${commitCount} commits for ${repo.name}`);

      processedRepos.push({
        name: repo.name,
        description: repo.description,
        topics: repo.topics || [],
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        issues: repo.open_issues_count || 0,
        last_commit: repo.pushed_at ? new Date(repo.pushed_at) : null,
        commit_count: commitCount,
        pull_request_count: 0 // Handle separately if needed
      });
    } catch (error) {
      console.error(`Error processing repo ${repo.name}:`, error);
      processedRepos.push({
        name: repo.name,
        description: repo.description,
        topics: repo.topics || [],
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        issues: repo.open_issues_count || 0,
        last_commit: repo.pushed_at ? new Date(repo.pushed_at) : null,
        commit_count: 0,
        pull_request_count: 0
      });
    }
  }

  return processedRepos;
}

// Update getUserRepos with better pagination and deduplication
async function getUserRepos(username, page = 1, perPage = 100) {
  try {
    const response = await githubApi.get(`/users/${username}/repos`, {
      params: {
        page,
        per_page: perPage,
        sort: 'updated',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching repos for ${username}:`, error.message);
    throw error;
  }
}

// Add these new functions after the existing ones

async function getUserOrganizations(username) {
  try {
    const response = await githubApi.get(`/users/${username}/orgs`, {
      params: {
        per_page: 100
      }
    });

    return response.data.map(org => ({
      id: org.id,
      login: org.login,
      avatar_url: org.avatar_url,
      description: org.description
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
        per_page: 100
      }
    });

    return response.data.map(gist => ({
      id: gist.id,
      description: gist.description,
      created_at: gist.created_at,
      updated_at: gist.updated_at,
      files: Object.keys(gist.files)
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
        Accept: 'application/vnd.github+json'
      }
    });
    const accounts = response.data;
    const social = {};
    accounts.forEach(account => {
      // Extract username from the URL (assumes format like https://twitter.com/username)
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

function extractSocialAccounts(bio, blog, socialUrls = []) {
  const social = {};

  // Helper to clean extracted username
  const cleanUsername = (str) => {
    if (!str) return null;
    return str.replace(/\/$/, '')
              .split('/').pop()
              .split('?')[0]
              .replace(/^@/, ''); // Remove leading '@'
  };

  // Common social media patterns
  const patterns = {
    linkedin: [
      /linkedin\.com\/in\/([^\/\s]+)/i,
      /linkedin\.com\/profile\/view\?id=([^\/\s]+)/i
    ],
    twitter: [
      /twitter\.com\/([^\/\s]+)/i,
      /x\.com\/([^\/\s]+)/i,
      /@([a-zA-Z0-9_]+)/i
    ],
    facebook: [
      /facebook\.com\/([^\/\s]+)/i,
      /fb\.com\/([^\/\s]+)/i
    ],
    instagram: [
      /instagram\.com\/([^\/\s]+)/i,
      /insta\.gram\.com\/([^\/\s]+)/i
    ],
    youtube: [
      /youtube\.com\/(?:c\/|channel\/|user\/)?([^\/\s@]+)/i,
      /youtube\.com\/@([^\/\s]+)/i
    ],
    github: [
      /github\.com\/([^\/\s]+)/i
    ],
    medium: [
      /medium\.com\/@([^\/\s]+)/i,
      /([^\/\s]+)\.medium\.com/i
    ],
    dev: [
      /dev\.to\/([^\/\s]+)/i
    ],
    stackoverflow: [
      /stackoverflow\.com\/users\/([^\/\s]+)/i
    ],
    dribbble: [
      /dribbble\.com\/([^\/\s]+)/i
    ],
    behance: [
      /behance\.net\/([^\/\s]+)/i
    ]
  };

  // Process text content for potential social media handles or URLs
  const processText = (text) => {
    if (!text) return;
    console.log('Processing text for social extraction:', text);

    // Extract and process URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    urls.forEach((url) => {
      Object.entries(patterns).forEach(([platform, regexList]) => {
        regexList.forEach((regex) => {
          const match = url.match(regex);
          if (match) {
            const extracted = cleanUsername(match[match.length - 1]);
            console.log(`Found ${platform}: ${extracted} from URL: ${url}`);
            social[platform] = extracted;
          }
        });
      });
    });

    // Also check plain text for patterns (e.g., @username)
    Object.entries(patterns).forEach(([platform, regexList]) => {
      regexList.forEach((regex) => {
        const match = text.match(regex);
        if (match && !social[platform]) {
          const extracted = cleanUsername(match[match.length - 1]);
          console.log(`Found ${platform}: ${extracted} in text`);
          social[platform] = extracted;
        }
      });
    });
  };

  // Process all provided sources: bio, blog, and additional URLs
  [bio, blog, ...socialUrls].filter(Boolean).forEach(processText);

  // Additional override for blog field
  if (blog) {
    if (blog.includes('linkedin.com')) social.linkedin = cleanUsername(blog);
    if (blog.includes('twitter.com') || blog.includes('x.com')) social.twitter = cleanUsername(blog);
    if (blog.includes('medium.com')) social.medium = cleanUsername(blog);
    if (blog.includes('dev.to')) social.dev = cleanUsername(blog);
  }

  // Ensure empty strings are converted to null
  Object.keys(social).forEach(key => {
    if (social[key] === "") {
      social[key] = null;
    }
  });

  return social;
}

module.exports = {
  getUserProfile,
  getUserRepos,
  getUserActivity,
  searchUsersByLocation,
  getRepoCommitCount,
  getUserOrganizations,
  getUserGists,
  processUserRepos,
  getUserSocialAccounts
};