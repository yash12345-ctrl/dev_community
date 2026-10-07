const express = require('express');
const router = express.Router();
const importController = require('./import.controller');

// POST /api/import
router.post('/', importController.startDeployment);

// GET /api/import/logs/:id (SSE for real-time terminal logs)
router.get('/logs/:id', importController.streamLogs);

// GET /api/import/deployments (Fetch real deployment history)
router.get('/deployments', importController.getDeployments);

module.exports = router;
