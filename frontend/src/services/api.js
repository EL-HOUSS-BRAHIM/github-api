import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxy configured in vite.config.js
});

const getUserProfile = (username) => api.get(`/user/${username}`);
const getUserRepos = (username, page, per_page) => api.get(`/user/${username}/repos?page=${page}&per_page=${per_page}`);
const getUserActivity = (username) => api.get(`/user/${username}/activity`);
const refreshUserInfo = (username) => api.post(`/user/${username}/refresh`);
const getUserRanking = (username) => api.get(`/ranking/user/${username}`);
const calculateUserRanking = (username) => api.post(`/ranking/calculate/${username}`);

export default {
  getUserProfile,
  getUserRepos,
  getUserActivity,
  refreshUserInfo,
  getUserRanking,
  calculateUserRanking,
};