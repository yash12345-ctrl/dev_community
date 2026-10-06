const githubService = require('./github.service');

const loginToGithub = (req, res) => {
  try {
    const authUrl = githubService.getAuthorizationUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate GitHub authorization URL', error: error.message });
  }
};

const handleGithubCallback = async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ message: 'No authorization code provided' });
  }

  try {
    // 1. Exchange the code for an access token
    const accessToken = await githubService.getAccessToken(code);
    
    // 2. Fetch the user's GitHub profile data
    const userProfile = await githubService.getUserProfile(accessToken);

    // 3. Redirect back to the frontend with the token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/?token=${accessToken}`);
    
    // In a real app, you might redirect to frontend with the token:
    // res.redirect(`http://localhost:3000/dashboard?token=${accessToken}`);

  } catch (error) {
    res.status(500).json({ message: 'GitHub authentication failed', error: error.message });
  }
};

const getUserRepositories = async (req, res) => {
  // In a real app, you would extract this token from the Authorization header using a middleware
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized. No token provided.' });
  }

  try {
    const repos = await githubService.getRepositories(token);
    res.json({ repos });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch repositories', error: error.message });
  }
};

module.exports = {
  loginToGithub,
  handleGithubCallback,
  getUserRepositories
};
