require('dotenv').config();
const express = require('express');
const cors = require('cors');
const githubRoutes = require('./github-connection/github.routes');
const projectsRoutes = require('./projects/projects.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/github', githubRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/import', require('./import/import.routes'));

// ========================================================
// 🌐 VERCEL-LIKE GLOBAL EDGE ROUTER & ZERO-DOWNTIME SWAP
// ========================================================
const fs = require('fs');
const path = require('path');

app.use('/live/:projectName', (req, res) => {
  const projectName = req.params.projectName;
  
  // Enforce trailing slash for relative asset loading
  if (req.originalUrl === `/live/${projectName}`) {
    return res.redirect(301, `/live/${projectName}/`);
  }

  const routerFile = path.join(__dirname, '..', 'deployments', 'router.json');
  
  if (fs.existsSync(routerFile)) {
    try {
      const routerConfig = JSON.parse(fs.readFileSync(routerFile, 'utf8'));
      const deploymentId = routerConfig.projects[projectName]?.current;
      
      if (deploymentId) {
        const edgeNodeDir = path.join(__dirname, '..', 'deployments', 'edge-nodes', deploymentId);
        
        // Resolve the requested file path
        let reqPath = req.path;
        if (reqPath === '/') reqPath = '/index.html';
        
        const filePath = path.join(edgeNodeDir, reqPath);
        
        // Serve the exact file if it exists (CSS, JS, Images)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return res.sendFile(filePath);
        } else {
          // SPA Fallback: Serve index.html for React/Vue client-side routing
          const indexHtml = path.join(edgeNodeDir, 'index.html');
          if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
        }
      }
    } catch (e) {
      console.error('Edge Router Error:', e);
    }
  }
  
  res.status(404).send(`
    <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
      <h2>404 - DEPLOYMENT NOT FOUND</h2>
      <p>The Edge Node could not locate a live deployment for <b>${projectName}</b>.</p>
    </div>
  `);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
