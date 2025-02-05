const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

router.post('/calculate/:username', rankingController.calculateUserRanking);
router.get('/user/:username', rankingController.getUserRanking);

// New route to harvest users by country
router.post('/harvest/:country', rankingController.harvestUsersByCountry);

module.exports = router;