const { APIError } = require('../../utils/errors');
const tokenManager = require('./tokenManager');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateWaitTime(resetHeader) {
  if (!resetHeader) {
    return 0;
  }

  const resetMs = Number(resetHeader) * 1000;
  if (Number.isNaN(resetMs)) {
    return 0;
  }

  return Math.max(0, resetMs - Date.now()) + 1000;
}

async function retryWithNextToken(client, originalRequest) {
  if (!tokenManager.hasTokens()) {
    return null;
  }

  originalRequest._tokenRetryCount = originalRequest._tokenRetryCount || 0;
  const maxRetries = Math.max(1, tokenManager.getTokenPoolSize());

  if (originalRequest._tokenRetryCount >= maxRetries) {
    return null;
  }

  const nextToken = tokenManager.getNextToken();

  if (!nextToken) {
    return null;
  }

  originalRequest._tokenRetryCount += 1;
  originalRequest.headers = originalRequest.headers || {};
  originalRequest.headers.Authorization = `token ${nextToken}`;
  originalRequest._githubToken = nextToken;

  return client.request(originalRequest);
}

async function handleRateLimit(error, client) {
  if (!error.response) {
    throw error;
  }

  const { status, headers } = error.response;
  const originalRequest = error.config || {};
  const usedToken = originalRequest._githubToken;

  if (status === 404) {
    throw new APIError(404, 'Resource not found on GitHub');
  }

  if (status === 403) {
    const rateLimitRemaining = headers['x-ratelimit-remaining'];
    const rateLimitReset = headers['x-ratelimit-reset'];

    if (rateLimitRemaining === '0') {
      tokenManager.markTokenRateLimited(usedToken, rateLimitReset);

      const retryWithToken = await retryWithNextToken(client, originalRequest);
      if (retryWithToken) {
        return retryWithToken;
      }

      const waitFromHeader = calculateWaitTime(rateLimitReset);
      const cooldownSummary = tokenManager.getCooldownSummary();
      const waitFromTokens = cooldownSummary ? cooldownSummary.min : 0;
      const waitTime = Math.max(waitFromHeader, waitFromTokens);

      if (waitTime > 0 && !originalRequest._rateLimitWaited) {
        const waitSeconds = Math.ceil(waitTime / 1000);
        console.warn(
          `GitHub rate limit exceeded and no tokens available. Waiting ${waitSeconds}s before retrying.`,
        );
        originalRequest._rateLimitWaited = true;
        await wait(waitTime);
        if (originalRequest.headers && originalRequest.headers.Authorization) {
          delete originalRequest.headers.Authorization;
        }
        delete originalRequest._githubToken;
        return client.request(originalRequest);
      }

      if (cooldownSummary && cooldownSummary.max > 0) {
        const nextWindowSeconds = Math.ceil(cooldownSummary.max / 1000);
        console.warn(
          `GitHub token pool exhausted. Next token becomes available in approximately ${nextWindowSeconds}s.`,
        );
      }

      throw new APIError(403, 'GitHub API rate limit exceeded');
    }

    throw new APIError(403, 'GitHub API request forbidden');
  }

  if (status >= 500) {
    throw new APIError(status, 'GitHub API server error');
  }

  throw error;
}

module.exports = {
  handleRateLimit,
};
