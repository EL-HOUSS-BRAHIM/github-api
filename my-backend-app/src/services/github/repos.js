const githubApi = require('./httpClient');
const { mapRepository } = require('./transformers');

const commitCountCache = new Map();

async function countCommitsManually(username, repoName) {
  let count = 0;
  let page = 1;
  const PER_PAGE = 100;

  while (true) {
    try {
      const response = await githubApi.get(`/repos/${username}/${repoName}/commits`, {
        params: {
          per_page: PER_PAGE,
          page,
        },
      });

      const commits = response.data || [];
      count += commits.length;

      if (commits.length < PER_PAGE) {
        break;
      }

      page += 1;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      break;
    }
  }

  return count;
}

async function getRepoCommitCount(username, repoName) {
  const cacheKey = `${username}/${repoName}`;
  if (commitCountCache.has(cacheKey)) {
    return commitCountCache.get(cacheKey);
  }

  try {
    const response = await githubApi.get(`/repos/${username}/${repoName}/commits`, {
      params: {
        per_page: 1,
      },
    });

    let count = 0;
    const link = response.headers.link;
    if (link) {
      const match = link.match(/page=(\d+)>; rel="last"/);
      if (match) {
        count = parseInt(match[1], 10);
        commitCountCache.set(cacheKey, count);
        return count;
      }
    }

    count = await countCommitsManually(username, repoName);
    commitCountCache.set(cacheKey, count);
    return count;
  } catch (error) {
    console.warn(`Error fetching commit count for ${cacheKey}:`, error.message);
    return 0;
  }
}

async function fetchUserRepos(username, page = 1, perPage = 100) {
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

async function processUserRepos(username, repos) {
  const processedRepos = [];

  for (const repo of repos) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const commitCount = await getRepoCommitCount(username, repo.name);
      processedRepos.push(mapRepository(repo, commitCount));
    } catch (error) {
      console.error(`Error processing repo ${repo.name}:`, error);
      processedRepos.push(mapRepository(repo, 0));
    }
  }

  return processedRepos;
}

module.exports = {
  fetchUserRepos,
  getRepoCommitCount,
  processUserRepos,
};
