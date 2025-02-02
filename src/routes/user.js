const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');

router.get('/:username', userController.getUserProfile);
router.get('/:username/repos', userController.getUserRepos);
router.get('/:username/activity', userController.getUserActivity);
router.get('/:username/report', userController.getAggregatedReport);

module.exports = router;
