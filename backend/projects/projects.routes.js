const express = require('express');
const router = express.Router();
const projectsController = require('./projects.controller');

// GET /api/projects/github - Fetches user's GitHub repositories
router.get('/github', projectsController.getGithubProjects);

module.exports = router;
