const fs = require("fs");
const path = require("path");
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const githubRoutes = require('./github-connection/github.routes');
const projectsRoutes = require('./projects/projects.routes');
const firewallRoutes = require('./firewall/firewall.routes');
const cookieParser = require('cookie-parser');
const ipRangeCheck = require('ip-range-check');
const geoip = require('geoip-lite');
const WAF_STATS_FILE = path.join(__dirname, '..', 'deployments', 'waf-stats.json');
if (!fs.existsSync(WAF_STATS_FILE)) fs.writeFileSync(WAF_STATS_FILE, JSON.stringify({}));
const wafStats = JSON.parse(fs.readFileSync(WAF_STATS_FILE, 'utf8'));
function recordWafStat(project, action, attackType = null, req = null) {
  if (!wafStats[project]) {
    wafStats[project] = { totalRequests: 0, threatsBlocked: 0, challenged: 0, attackTypes: {}, history: {}, events: [], blockedIps: {} };
  }
  
  if (!wafStats[project].history) wafStats[project].history = {};
  if (!wafStats[project].events) wafStats[project].events = [];
  if (!wafStats[project].blockedIps) wafStats[project].blockedIps = {};

  const hourKey = new Date().toISOString().slice(0, 13);
  if (!wafStats[project].history[hourKey]) {
    wafStats[project].history[hourKey] = { allowed: 0, blocked: 0 };
  }

  if (action === 'request') {
    wafStats[project].totalRequests++;
    wafStats[project].history[hourKey].allowed++;
  } else if (action === 'block' || action === 'challenge') {
    if (action === 'block') {
      wafStats[project].threatsBlocked++;
      wafStats[project].history[hourKey].blocked++;
      if (wafStats[project].history[hourKey].allowed > 0) wafStats[project].history[hourKey].allowed--;
      
      if (attackType) {
        wafStats[project].attackTypes[attackType] = (wafStats[project].attackTypes[attackType] || 0) + 1;
      }
    } else {
      wafStats[project].challenged++;
    }

    if (req) {
      const ip = req.ip || req.connection.remoteAddress;
      const country = geoip.lookup(ip)?.country || 'Unknown';
      const event = {
        time: new Date().toISOString(),
        ip,
        country,
        path: req.originalUrl || req.path,
        rule: attackType || 'Challenge',
        action
      };
      
      wafStats[project].events.unshift(event);
      if (wafStats[project].events.length > 50) {
        wafStats[project].events.pop();
      }

      if (action === 'block') {
        wafStats[project].blockedIps[ip] = (wafStats[project].blockedIps[ip] || 0) + 1;
      }
    }
  }
  fs.writeFile(WAF_STATS_FILE, JSON.stringify(wafStats), () => {});
}


const app = express();

app.use(cookieParser());
app.use(cors());
app.use(express.json());

// Cache for dynamic rate limiters
const limitersCache = new Map();

function getLimiter(id, maxReqs) {
  if (!limitersCache.has(id)) {
    limitersCache.set(id, rateLimit({
      windowMs: 60 * 1000,
      max: maxReqs,
      message: `429 Too Many Requests - Firewall Rate Limit Exceeded (Limit: ${maxReqs})`,
      keyGenerator: (req) => req.ip + '_' + id,
      validate: { ip: false }
    }));
  }
  return limitersCache.get(id);
}

// Routes
app.use('/api/github', githubRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/import', require('./import/import.routes'));
app.use('/api/firewall', firewallRoutes);


// --- ANALYTICS SYSTEM ---
const ANALYTICS_FILE = path.join(__dirname, '..', 'deployments', 'analytics.json');
if (!fs.existsSync(ANALYTICS_FILE)) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify({ 
    totalRequests: 0, 
    totalBandwidthBytes: 0,
    total4xx: 0,
    total5xx: 0,
    history: {} // e.g. "2026-10-06T15": 10
  }));
}

function recordAnalytics(bytes = 0, is4xx = false, is5xx = false) {
  try {
    const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
    
    // Increment totals
    data.totalRequests += 1;
    data.totalBandwidthBytes += bytes;
    if (is4xx) data.total4xx = (data.total4xx || 0) + 1;
    if (is5xx) data.total5xx = (data.total5xx || 0) + 1;
    
    // Time-series (hourly buckets)
    if (!data.history) data.history = {};
    const now = new Date();
    // Format: YYYY-MM-DDTHH
    const hourKey = now.toISOString().slice(0, 13);
    data.history[hourKey] = (data.history[hourKey] || 0) + 1;
    
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data));
  } catch(e) {}
}

app.get('/api/analytics', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
    res.json(data);
  } catch(e) {
    res.json({ totalRequests: 0, totalBandwidthBytes: 0 });
  }
});

app.post('/api/log-error', (req, res) => {
  console.log('[CLIENT ERROR]', req.body);
  res.sendStatus(200);
});

// Wildcard Subdomain Router Middleware
app.use((req, res, next) => {
  const host = req.hostname; // e.g., 'placement_web.dev-21.duckdns.org'
  const domain = process.env.DOMAIN || 'localhost';
  
  // If no subdomain, continue to regular API / Frontend routing
  if (!host.endsWith(`.${domain}`)) {
    return next();
  }

  // Hook into response finish to track 4xx/5xx errors
  res.on('finish', () => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      recordAnalytics(0, true, false);
    } else if (res.statusCode >= 500) {
      recordAnalytics(0, false, true);
    }
  });

  // Extract the project name from the subdomain (e.g., placement_web)
  const projectName = host.replace(`.${domain}`, '');

  const routerFile = path.join(__dirname, '..', 'deployments', 'router.json');
  
  if (fs.existsSync(routerFile)) {
    try {
      const routerConfig = JSON.parse(fs.readFileSync(routerFile, 'utf8'));
      const deploymentId = routerConfig.projects[projectName]?.current;
      
      if (deploymentId) {
        // --- FIREWALL CHECK ---
        const FIREWALL_FILE = path.join(__dirname, '..', 'deployments', 'firewall.json');
        let fwConfig = { enabled: false, strictMode: false, rateLimit: false, botProtection: false, challengeMode: false, owaspRules: false, securityHeaders: false, forceHttps: false, customRules: [], ipAccessList: [], geoAccessList: [], advancedRules: [] };
        if (fs.existsSync(FIREWALL_FILE)) {
          try {
            const db = JSON.parse(fs.readFileSync(FIREWALL_FILE, 'utf8'));
            if (db[projectName]) fwConfig = { ...fwConfig, ...db[projectName] };
          } catch(e) {}
        }

        const serveEdgeNode = () => {
          const edgeNodeDir = path.join(__dirname, '..', 'deployments', 'edge-nodes', deploymentId);
          
          let reqPath = req.path;
          if (reqPath === '/') reqPath = '/index.html';
          
          const filePath = path.join(edgeNodeDir, reqPath);
          
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const size = fs.statSync(filePath).size;
            recordAnalytics(size);
            return res.sendFile(filePath);
          } else {
            const indexHtml = path.join(edgeNodeDir, 'index.html');
            if (fs.existsSync(indexHtml)) {
              const size = fs.statSync(indexHtml).size;
              recordAnalytics(size);
              return res.sendFile(indexHtml);
            }
          }
        };

        if (fwConfig.enabled) {
          recordWafStat(projectName, 'request', null, req);

          // If Under Attack mode is enabled, forcefully activate all protections
          if (fwConfig.strictMode) {
            fwConfig.botProtection = true;
            fwConfig.challengeMode = true;
            fwConfig.securityHeaders = true;
          }

          // 0.2 Force HTTPS Redirect
          if (fwConfig.forceHttps) {
            const proto = req.headers['x-forwarded-proto'] || req.protocol;
            if (proto !== 'https' && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
              return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
            }
          }

          // 0.5 IP Access Control List (CIDR / Single IP)
          if (fwConfig.ipAccessList && fwConfig.ipAccessList.length > 0) {
            const clientIp = req.ip.replace(/^::ffff:/, ''); // Normalize IPv4-mapped IPv6
            let isBlocked = false;

            for (const rule of fwConfig.ipAccessList) {
              try {
                if (ipRangeCheck(clientIp, rule.ip)) {
                  if (rule.action === 'block') {
                    isBlocked = true;
                    break;
                  } else if (rule.action === 'allow') {
                    break; // Allowed explicitly, skip other IP checks
                  }
                }
              } catch (e) {
                // Ignore invalid CIDR formats in the rule
              }
            }

            if (isBlocked) {
              res.status(403);
              recordWafStat(projectName, 'block', 'IP Blacklist', req);
              return res.send('403 Forbidden - Your IP Address has been blocked by the Firewall.');
            }
          }

          // 0.7 Geo-Fencing (Country Block)
          if (fwConfig.geoAccessList && fwConfig.geoAccessList.length > 0) {
            const clientIp = req.ip.replace(/^::ffff:/, ''); // Normalize IPv4-mapped IPv6
            const geo = geoip.lookup(clientIp);
            if (geo) {
              const countryCode = geo.country.toUpperCase();
              let isBlocked = false;

              for (const rule of fwConfig.geoAccessList) {
                if (rule.country.toUpperCase() === countryCode) {
                  if (rule.action === 'block') {
                    isBlocked = true;
                    break;
                  } else if (rule.action === 'allow') {
                    break;
                  }
                }
              }

              if (isBlocked) {
                res.status(403);
                recordWafStat(projectName, 'block', 'Geo-Fencing', req);
                return res.send('403 Forbidden - Access from your country has been blocked by the Firewall.');
              }
            }
          }

          // 0.8 Advanced Custom Rules Engine
          if (fwConfig.advancedRules && fwConfig.advancedRules.length > 0) {
            const clientIp = req.ip.replace(/^::ffff:/, '');
            const geo = geoip.lookup(clientIp);
            const countryCode = geo ? geo.country.toUpperCase() : '';
            const ua = (req.headers['user-agent'] || '').toLowerCase();
            const pathUrl = req.path;

            for (const rule of fwConfig.advancedRules) {
              let isMatch = false;
              let targetValue = '';

              if (rule.field === 'ip') targetValue = clientIp;
              else if (rule.field === 'country') targetValue = countryCode;
              else if (rule.field === 'user-agent') targetValue = ua;
              else if (rule.field === 'path') targetValue = pathUrl;

              const val = (rule.value || '').toLowerCase();
              targetValue = targetValue.toLowerCase();

              if (rule.field === 'ip') {
                 try {
                   isMatch = ipRangeCheck(clientIp, rule.value);
                 } catch(e) {
                   isMatch = (clientIp === rule.value);
                 }
              } else {
                if (rule.operator === 'equals' && targetValue === val) isMatch = true;
                else if (rule.operator === 'contains' && targetValue.includes(val)) isMatch = true;
              }

              console.log("Custom Rule Match:", isMatch, rule); if (isMatch) {
                if (rule.action === 'block') {
                  res.status(403);
                  return res.send('403 Forbidden - Blocked by Custom Firewall Rule.');
                } else if (rule.action === 'challenge') {
                  if (!req.cookies['dev_waf_verified']) {
                    if (req.accepts('html')) {
                      return res.status(503).send(`
                        <html>
                          <head><title>Checking your browser...</title></head>
                          <body style="font-family: system-ui; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff;">
                            <div style="border: 4px solid #333; border-top: 4px solid #fff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
                            <h2>Verifying you are human...</h2>
                            <p>A Custom Firewall Rule requires you to pass a security check.</p>
                            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                            <script>
                              setTimeout(() => { document.cookie = "dev_waf_verified=true; path=/; max-age=3600"; window.location.reload(); }, 3000);
                            </script>
                          </body>
                        </html>
                      `);
                    } else {
                      res.status(403);
                      recordWafStat(projectName, 'block', 'Failed Challenge', req);
                      return res.send('403 Forbidden - Custom Rule Challenge Required.');
                    }
                  }
                  // If cookie exists, they passed the challenge, so continue evaluating other rules or skip.
                } else if (rule.action === 'log') {
                  console.log(`[WAF LOG] Custom rule triggered: ${rule.field} ${rule.operator} ${rule.value} on ${req.method} ${req.originalUrl}`);
                }
              }
            }
          }

          // 1. Bot Protection Check
          if (fwConfig.botProtection) {
            const ua = (req.headers['user-agent'] || '').toLowerCase();
            const blockedBots = ['curl', 'wget', 'python', 'scrapy', 'postman', 'httpclient', 'java'];
            if (!ua || blockedBots.some(bot => ua.includes(bot))) {
              res.status(403);
              recordWafStat(projectName, 'block', 'Bad Bot', req);
              return res.send('403 Forbidden - Malicious Bot Detected by Dev Community Edge WAF');
            }
          }

          // 1.5 OWASP Top 10 Deep Packet Inspection
          if (fwConfig.owaspRules) {
            const sqliPattern = /union\s+select|select.*from|insert\s+into|drop\s+table|update.*set|delete\s+from|or\s+1=1|'1'='1'|--(\s|$)/i;
            const xssPattern = /<script>|javascript:|onerror=|onload=|document\.cookie/i;
            const lfiPattern = /\.\.\/|\.\.\\|\.\.%2f|\/etc\/passwd|c:\\windows/i;
            const cmdPattern = /;|\|\||&&|\$\(|\b(bash|sh|ping|nc|wget|curl)\b/i;

            const checkPayload = (payload) => {
              if (!payload) return false;
              const str = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
              return sqliPattern.test(str) || xssPattern.test(str) || lfiPattern.test(str) || cmdPattern.test(str);
            };

            // Inspect URI, Query, Body, and Headers
            if (checkPayload(decodeURIComponent(req.originalUrl)) || 
                checkPayload(req.body) || 
                checkPayload(req.headers['user-agent'])) {
              res.status(403);
              recordWafStat(projectName, 'block', 'OWASP Payload', req); return res.send('403 Forbidden - Malicious Payload Detected by Dev Community Edge WAF (OWASP Rules)');
            }
          }

          // 2. Challenge Mode (JS Check)
          if (fwConfig.challengeMode) {
            // Only challenge top-level HTML navigations, not assets
            if (req.accepts('html') && !req.cookies['dev_waf_verified']) {
              const delayMs = fwConfig.strictMode ? 5000 : 2500;
              const titleColor = fwConfig.strictMode ? '#e53e3e' : '#fff';
              const modeText = fwConfig.strictMode ? 'UNDER ATTACK MODE ACTIVE' : 'Dev Community Edge Firewall is checking your browser.';
              
              return res.status(503).send(`
                <html>
                  <head>
                    <title>Checking your browser...</title>
                    <style>
                      body { font-family: system-ui; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff; }
                      .loader { border: 4px solid #333; border-top: 4px solid ${titleColor}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                      .warning { color: ${titleColor}; font-weight: bold; margin-top: 10px; font-size: 0.9rem; letter-spacing: 1px; }
                    </style>
                  </head>
                  <body>
                    <div class="loader"></div>
                    <h2>Verifying you are human...</h2>
                    <p>Please wait. We are reviewing the security of your connection.</p>
                    <div class="warning">${modeText}</div>
                    <script>
                      setTimeout(() => {
                        document.cookie = "dev_waf_verified=true; path=/; max-age=3600";
                        window.location.reload();
                      }, ${delayMs});
                    </script>
                  </body>
                </html>
              `);
            }
          }

          const runRateLimiterAndServe = () => {
            // Calculate limit
            let maxReqs = fwConfig.rateLimit ? 100 : 0;
            if (fwConfig.strictMode) maxReqs = 20;
            
            let matchedRulePath = null;
            if (fwConfig.customRules && fwConfig.customRules.length > 0) {
              const rule = fwConfig.customRules.find(r => req.path.startsWith(r.path));
              if (rule) {
                maxReqs = rule.limit;
                matchedRulePath = rule.path;
              }
            }

            if (maxReqs > 0) {
              const limiterId = projectName + (matchedRulePath ? '_custom_' + matchedRulePath : '_global');
              const limiter = getLimiter(limiterId, maxReqs);
              return limiter(req, res, serveEdgeNode);
            }
            
            return serveEdgeNode();
          };
          
          if (fwConfig.securityHeaders) {
            return helmet()(req, res, runRateLimiterAndServe);
          } else {
            return runRateLimiterAndServe();
          }
        }

        return serveEdgeNode();
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

// Backward compatibility for local /live/:projectName testing
app.use('/live/:projectName', (req, res) => {
  const projectName = req.params.projectName;
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
        let reqPath = req.path;
        if (reqPath === '/') reqPath = '/index.html';
        const filePath = path.join(edgeNodeDir, reqPath);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const size = fs.statSync(filePath).size;
          recordAnalytics(size);
          return res.sendFile(filePath);
        } else {
          const indexHtml = path.join(edgeNodeDir, 'index.html');
          if (fs.existsSync(indexHtml)) {
            const size = fs.statSync(indexHtml).size;
            recordAnalytics(size);
            return res.sendFile(indexHtml);
          }
        }
      }
    } catch (e) {}
  }
  res.status(404).send('Not Found');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
