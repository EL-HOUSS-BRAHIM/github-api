const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');

router.post('/calculate/:username', rankingController.calculateUserRanking);
router.get('/user/:username', rankingController.getUserRanking);

module.exports = router;