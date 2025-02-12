const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');

// GET /api/user/:username
/**
 * Retrieves detailed profile information for a GitHub user
 * 
 * @param {string} username - GitHub username
 * @returns {Object} User profile data
 * {
 *   username: string,
 *   full_name: string,
 *   avatar_url: string,
 *   bio: string,
 *   location: string,
 *   company: string,
 *   website: string,
 *   followers: number,
 *   following: number,
 *   public_repos: number,
 *   social: Object,
 *   is_fresh: boolean,
 *   last_fetched: string (ISO date)
 * }
 */
router.get('/:username', userController.getUserProfile);

// GET /api/user/:username/repos
/**
 * Fetches paginated list of user's repositories
 * 
 * @param {string} username - GitHub username
 * @param {number} page - Page number (default: 1) 
 * @param {number} per_page - Items per page (default: 10)
 * @returns {Object} Paginated repository data
 * {
 *   total_count: number,
 *   page: number,
 *   per_page: number,
 *   repos: [{
 *     name: string,
 *     description: string,
 *     stars: number,
 *     forks: number,
 *     issues: number,
 *     last_commit: string (ISO date),
 *     commit_count: number,
 *     pull_request_count: number,
 *     topics: string[]
 *   }]
 * }
 */
router.get('/:username/repos', userController.getUserRepos);

// GET /api/user/:username/activity
/**
 * Retrieves user's GitHub activity history
 * 
 * @param {string} username - GitHub username
 * @returns {Object} Activity data
 * {
 *   username: string,
 *   activities: [{
 *     date: string (YYYY-MM-DD),
 *     commits: number,
 *     pull_requests: number,
 *     issues_opened: number
 *   }]
 * }
 */
router.get('/:username/activity', userController.getUserActivity);

// GET /api/user/:username/report
/**
 * Generates comprehensive user activity report
 * 
 * @param {string} username - GitHub username
 * @returns {Object} Complete user report
 * {
 *   profile: Object,
 *   repositories: Array,
 *   activity: {
 *     daily: Object,
 *     monthly: Object
 *   },
 *   trophies: Array,
 *   achievements: Array,
 *   ranking: Object
 * }
 */
router.get('/:username/report', userController.getUserReport);

// POST /api/user/:username/refresh
/**
 * Forces refresh of user data from GitHub
 * 
 * @param {string} username - GitHub username
 * @returns {Object} Refresh status
 * {
 *   status: 'refreshing',
 *   message: string,
 *   username: string,
 *   retryAfter: number
 * }
 */
router.post('/:username/refresh', userController.refreshUserInfo);

module.exports = router;