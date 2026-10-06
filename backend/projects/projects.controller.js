const githubService = require('../github-connection/github.service');

// Get all GitHub repositories for the authenticated user
const getGithubProjects = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const repos = await githubService.getRepositories(token);
    // You could filter these or map them to a specific structure if needed
    res.json({ projects: repos });
  } catch (error) {
    console.error('Error fetching GitHub projects:', error);
    res.status(500).json({ message: 'Failed to fetch GitHub projects', error: error.message });
  }
};

module.exports = {
  getGithubProjects
};
