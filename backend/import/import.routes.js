const express = require('express');
const router = express.Router();
const importController = require('./import.controller');

// POST /api/import
router.post('/', importController.startDeployment);

// GET /api/import/logs/:id (SSE for real-time terminal logs)
router.get('/logs/:id', importController.streamLogs);

module.exports = router;
