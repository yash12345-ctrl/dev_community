const axios = require('axios');

// These should be configured in your .env file
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'your_client_id_here';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'your_client_secret_here';
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:5000/api/github/callback';

const getAuthorizationUrl = () => {
  const scopes = ['read:user', 'repo', 'admin:repo_hook'].join(' ');
  return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scopes}`;
};

const getAccessToken = async (code) => {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    },
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );
  
  if (response.data.error) {
    throw new Error(response.data.error_description || response.data.error);
  }

  return response.data.access_token;
};

const getUserProfile = async (accessToken) => {
  const response = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

const getRepositories = async (accessToken) => {
  const response = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
};

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  getUserProfile,
  getRepositories
};
