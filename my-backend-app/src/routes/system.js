const express = require('express');
const router = express.Router();
const systemController = require('../controllers/system');

router.get('/health', systemController.getQueueHealth);

module.exports = router;
