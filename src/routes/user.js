const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');

// Route to get a user's profile
router.get('/:username', userController.getUserProfile);

// Route to get a user's repositories
router.get('/:username/repos', userController.getUserRepos);

// Route to get a user's activity
router.get('/:username/activity', userController.getUserActivity);

// Route to get a user's report
router.get('/:username/report', userController.getUserReport); // Changed from getAggregatedReport

// Route to refresh user info
router.post('/:username/refresh', userController.refreshUserInfo);

module.exports = router;