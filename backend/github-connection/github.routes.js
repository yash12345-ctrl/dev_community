const express = require('express');
const router = express.Router();
const githubController = require('./github.controller');

// GET /api/github/login - Redirects to GitHub OAuth
router.get('/login', githubController.loginToGithub);

// GET /api/github/callback - GitHub redirects back here with a code
router.get('/callback', githubController.handleGithubCallback);

// GET /api/github/repos - Fetch repositories for the authenticated user
router.get('/repos', githubController.getUserRepositories);

module.exports = router;
