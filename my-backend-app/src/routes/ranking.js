// src/routes/ranking.js
const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

// POST /api/ranking/calculate/:username
/**
 * Calculates/updates ranking for specified user
 * 
 * @param {string} username - GitHub username
 * @returns {Object} Updated ranking data
 * {
 *   success: boolean,
 *   ranking: {
 *     score: number,
 *     globalRank: number,
 *     countryRank: number,
 *     totalCommits: number,
 *     totalContributions: number,
 *     lastCalculated: string (ISO date)
 *   }
 * }
 */
router.post('/calculate/:username', rankingController.calculateUserRanking);

// GET /api/ranking/user/:username
/**
 * Gets current ranking information for user
 * 
 * @param {string} username - GitHub username
 * @returns {Object} Ranking data
 * {
 *   user_id: number,
 *   country: string,
 *   score: number,
 *   total_commits: number, 
 *   total_contributions: number,
 *   global_rank: number,
 *   country_rank: number,
 *   last_calculated_at: string (ISO date)
 * }
 */
router.get('/user/:username', rankingController.getUserRanking);

// POST /api/ranking/harvest/:country
/**
 * Discovers and processes GitHub users from specified country
 * 
 * @param {string} country - Country name
 * @returns {Object} Harvest results
 * {
 *   success: boolean,
 *   message: string,
 *   total_found: number,
 *   processed: number,
 *   users: [{
 *     username: string,
 *     followers: number,
 *     location: string
 *   }],
 *   errors: Array (optional),
 *   rate_limit: Object
 * }
 */
router.post('/harvest/:country', rankingController.harvestUsersByCountry);

module.exports = router;