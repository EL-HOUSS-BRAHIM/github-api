const axios = require('axios');
const { handleRateLimit } = require('./rateLimit');
const tokenManager = require('./tokenManager');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json',
  },
});

githubApi.interceptors.request.use((request) => {
  request.headers = request.headers || {};

  if (typeof request._githubToken !== 'undefined') {
    if (request._githubToken) {
      request.headers.Authorization = `token ${request._githubToken}`;
    } else {
      delete request.headers.Authorization;
    }
    return request;
  }

  const token = tokenManager.getNextToken();

  if (token) {
    request.headers.Authorization = `token ${token}`;
    request._githubToken = token;
  } else {
    delete request.headers.Authorization;
    request._githubToken = null;
  }

  return request;
});

githubApi.interceptors.response.use(
  (response) => {
    if (response.config?._githubToken) {
      tokenManager.recordTokenSuccess(response.config._githubToken);
    }
    return response;
  },
  (error) => handleRateLimit(error, githubApi)
);

module.exports = githubApi;
